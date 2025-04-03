import CourseModel from '@models/Course';
import cron from 'node-cron';
import { App, Octokit } from 'octokit';
import { getGitHubApp } from '../utils/github';
import * as fs from 'fs';
import * as path from 'path';
import codeAnalysisDataModel from '../models/CodeAnalysisData';
import { mean, median } from 'mathjs';
import TeamDataModel from '@models/TeamData';
import TeamModel from '@models/Team';
import { Types } from 'mongoose';
import { glob } from 'glob';
import {
  getRatingsMapping,
  OVERVIEW_METRICS,
  OVERVIEW_WEIGHTS,
} from '../utils/overviewMetrics';

const { exec } = require('child_process');

const fetchAndSaveCodeAnalysisData = async () => {
  const app: App = getGitHubApp();
  const octokit = app.octokit;

  const response = await octokit.rest.apps.listInstallations();
  const installationIds = response.data.map(installation => installation.id);

  const courses = await CourseModel.find({
    installationId: { $in: installationIds },
  });

  const currDate = new Date();

  await Promise.all(
    courses.map(async course => {
      // Only scan courses that are currently running
      const endDate = new Date(course.startDate);
      endDate.setDate(endDate.getDate() + course.durationWeeks * 7);
      if (
        course &&
        course.installationId &&
        currDate >= course.startDate &&
        currDate <= endDate
      ) {
        const installationOctokit = await app.getInstallationOctokit(
          course.installationId
        );
        await getCourseCodeData(installationOctokit, course);
        await getMedianAndMeanCodeData(course);
        await getOverviewRankings(course);
      }
    })
  );

  console.log('Code analysis data fetched');
};

const getCourseCodeData = async (octokit: Octokit, course: any) => {
  if (!course.gitHubOrgName) return;
  const gitHubOrgName = course.gitHubOrgName;

  const repos = await octokit.rest.repos.listForOrg({
    org: course.gitHubOrgName,
    sort: 'updated',
    per_page: 300,
    direction: 'desc',
  });
  let allRepos = repos.data;

  if (course.repoNameFilter) {
    allRepos = allRepos.filter(repo =>
      repo.name.includes(course.repoNameFilter as string)
    );
  }

  for (const repo of allRepos) {
    const buildTool = await getRepoBuildTool(octokit, gitHubOrgName, repo.name);
    if (buildTool === '.NET' || buildTool === 'Error') continue;

    await createProjectIfNotExists(gitHubOrgName + '_' + repo.name);

    await getLatestCommit(octokit, gitHubOrgName, repo, course);

    await scanRepo(gitHubOrgName, repo.name, buildTool);

    await getAndSaveCodeData(gitHubOrgName, repo);
  }
};

const getRepoBuildTool = async (
  octokit: Octokit,
  owner: string,
  repo: string
) => {
  try {
    // Fetch repository root directory content
    const contents = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '',
    });

    if (Array.isArray(contents.data)) {
      const files = contents.data.map(file => file.name);

      // Check for Maven
      if (files.includes('pom.xml')) {
        return 'Maven';
      }

      // Check for Gradle
      if (
        files.includes('build.gradle') ||
        files.includes('build.gradle.kts')
      ) {
        return 'Gradle';
      }

      // Check for .NET-related project files
      const dotnetProjectFiles = files.filter(
        file =>
          file.endsWith('.csproj') ||
          file.endsWith('.fsproj') ||
          file.endsWith('.vbproj') ||
          file.endsWith('.sln')
      );

      if (dotnetProjectFiles.length > 0) return '.NET';

      // If none of the above, return 'Others'
      return 'Others';
    }

    return 'Others';
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Error fetching build tool for repository ${repo}: ${error.message}`
      );
    } else {
      console.error(
        `Unknown error fetching build tool for repository ${repo}:`,
        error
      );
    }
    return 'Error';
  }
};

const createProjectIfNotExists = async (repo: string) => {
  try {
    const sonarUri = process.env.SONAR_URI;
    const sonarToken = process.env.SONAR_TOKEN;

    const searchResponse = await fetch(
      `${sonarUri}/api/projects/search?projects=${repo}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sonarToken}:`).toString('base64')}`,
        },
      }
    );

    const searchResult = await searchResponse.json();

    if (searchResult.components && searchResult.components.length > 0) {
      return;
    }

    const formData = `name=${encodeURIComponent(repo)}&project=${encodeURIComponent(repo)}`;

    const createResponse = await fetch(`${sonarUri}/api/projects/create`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sonarToken}:`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!createResponse.ok) {
      const errorResponse = await createResponse.json();
      console.error(`Failed to create project: ${errorResponse.errors[0].msg}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Error checking / creating project for repository ${repo}: ${error.message}`
      );
    } else {
      console.error(
        `Unknown error checking / creating project for repository ${repo}:`,
        error
      );
    }
  }
};

const getLatestCommit = async (
  octokit: Octokit,
  gitHubOrgName: string,
  repo: any,
  course: any
) => {
  try {
    const repoPath = path.join(
      process.env.REPO_PATH || '',
      gitHubOrgName,
      repo.name
    );

    const installationTokenResponse =
      await octokit.rest.apps.createInstallationAccessToken({
        installation_id: course.installationId,
      });
    const installationToken = installationTokenResponse.data.token;

    const cloneUrl = `https://oauth2:${installationToken}@github.com/${gitHubOrgName}/${repo.name}.git`;

    if (!fs.existsSync(repoPath)) {
      fs.mkdirSync(repoPath, { recursive: true });
    }

    if (!fs.existsSync(path.join(repoPath, '.git'))) {
      console.log(`Cloning repository ${repo.name}...`);
      fs.rmSync(repoPath, { recursive: true, force: true });
      fs.mkdirSync(repoPath, { recursive: true });
      await execShellCommand(`git clone ${cloneUrl} ${repoPath}`);
    } else {
      console.log(`Pulling repository ${repo.name}`);
      await execShellCommand(`git -C ${repoPath} reset --hard`); // reset any changes
      await execShellCommand(`git -C ${repoPath} pull ${cloneUrl}`);
    }

    // Remove .scannerwork and sonar-project.properties if they exist
    const sonarPropsFiles = glob.sync(
      path.join(repoPath, '**/sonar-project.properties')
    );
    sonarPropsFiles.forEach(file => fs.unlinkSync(file));

    const scannerworkDirs = glob.sync(path.join(repoPath, '**/.scannerwork'), {
      dot: true,
    });
    scannerworkDirs.forEach(dir =>
      fs.rmSync(dir, { recursive: true, force: true })
    );
  } catch (error) {
    console.error(`Error updating repository ${repo.name}: ${error}`);
  }
};

const execShellCommand = (cmd: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(cmd, (error: Error | null, stdout: string, stderr: string) => {
      if (error) {
        reject(
          `Command failed: ${cmd}\nError: ${error.message}\nStderr: ${stderr}`
        );
        return;
      }
      resolve(stdout);
    });
  });
};

const scanRepo = async (
  gitHubOrgName: string,
  repo: string,
  buildTool: string
) => {
  try {
    const repoPath = path.join(
      process.env.REPO_PATH || '',
      gitHubOrgName,
      repo
    );

    const projectKey = gitHubOrgName + '_' + repo;

    if (!fs.existsSync(repoPath)) {
      console.error(`Repository path not found: ${repoPath}`);
      return;
    }

    process.chdir(repoPath);

    if (buildTool === 'Maven') {
      const mavenCommand = `mvn clean verify sonar:sonar \
        -Dsonar.projectKey=${projectKey} \
        -Dsonar.projectName=${projectKey} \
        -Dsonar.host.url=${process.env.SONAR_URI} \
        -Dsonar.token=${process.env.SONAR_TOKEN}`;

      await execShellCommand(mavenCommand);
    } else if (buildTool === 'Gradle') {
      const gradleCommand = `./gradlew sonar \
        -Dsonar.projectKey=${projectKey} \
        -Dsonar.projectName=${projectKey} \
        -Dsonar.host.url=${process.env.SONAR_URI} \
        -Dsonar.token=${process.env.SONAR_TOKEN}`;

      await execShellCommand(gradleCommand);
    } else if (buildTool === 'Others') {
      // Handle other build tools
      const othersCommand = `${process.env.SONAR_PATH} \
        -Dsonar.projectKey=${projectKey} \
        -Dsonar.sources=. \
        -Dsonar.host.url=${process.env.SONAR_URI} \
        -Dsonar.token=${process.env.SONAR_TOKEN}`;

      await execShellCommand(othersCommand);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error scanning repository ${repo}: ${error.message}`);
    } else {
      console.error(`Unknown error scanning repository ${repo}:`, error);
    }
  }
};

const getAndSaveCodeData = async (gitHubOrgName: string, repo: any) => {
  const MAX_ATTEMPTS = 3;
  const DELAY = 90000;
  try {
    const sonarUri = process.env.SONAR_URI;
    const sonarToken = process.env.SONAR_TOKEN;
    const projectKey = `${gitHubOrgName}_${repo.name}`;
    const metricKeys =
      'complexity, cognitive_complexity, branch_coverage, coverage, line_coverage, tests, uncovered_conditions, uncovered_lines, test_execution_time, test_errors,  test_failures, test_success_density, skipped_tests, duplicated_blocks, duplicated_files, duplicated_lines, duplicated_lines_density, code_smells, sqale_index, sqale_debt_ratio, sqale_rating, alert_status, quality_gate_details, bugs, reliability_rating, reliability_remediation_effort, vulnerabilities, security_rating, security_remediation_effort, security_hotspots, classes, comment_lines, comment_lines_density, files, lines, ncloc, functions, statements';

    let attempts = 0;

    while (attempts < MAX_ATTEMPTS) {
      try {
        const codeAnalysisResponse = await fetch(
          `${sonarUri}/api/measures/component?component=${projectKey}&metricKeys=${metricKeys}&additionalFields=metrics`,
          {
            method: 'GET',
            headers: {
              Authorization: `Basic ${Buffer.from(`${sonarToken}:`).toString('base64')}`,
            },
          }
        );

        if (!codeAnalysisResponse.ok) {
          throw new Error(
            `Failed to fetch data from Sonar API: ${codeAnalysisResponse.statusText}`
          );
        }

        const responseData = await codeAnalysisResponse.json();

        const { component, metrics } = responseData;

        if (
          !component ||
          !component.measures ||
          component.measures.length === 0
        ) {
          if (attempts < MAX_ATTEMPTS - 1) {
            attempts++;
            console.warn(
              `Attempt ${attempts} failed for repo: ${repo.name}. Retrying in ${DELAY / 1000} seconds...`
            );
            await new Promise(resolve => setTimeout(resolve, DELAY));
            continue;
          } else {
            throw new Error(
              `Invalid response structure or empty measures for repo: ${repo.name} after maximum retries`
            );
          }
        }

        const metricsArray: string[] = [];
        const valuesArray: string[] = [];
        const typesArray: string[] = [];
        const domainsArray: string[] = [];

        const metricMap = new Map<string, { type: string; domain: string }>();
        const compositeDataMap = new Map<string, number>();

        metrics.forEach((metric: any) => {
          metricMap.set(metric.key, {
            type: metric.type,
            domain: metric.domain,
          });
        });

        component.measures.forEach((measure: any) => {
          const metricKey = measure.metric;
          const metricInfo = metricMap.get(metricKey);

          if (metricInfo) {
            metricsArray.push(metricKey);
            valuesArray.push(measure.value || '');
            typesArray.push(metricInfo.type || '');
            domainsArray.push(metricInfo.domain || '');

            if (
              metricKey === 'bugs' ||
              metricKey === 'code_smells' ||
              metricKey === 'ncloc'
            ) {
              compositeDataMap.set(metricKey, measure.value);
            }
          }
        });

        const codeAnalysisData = new codeAnalysisDataModel({
          executionTime: new Date(),
          gitHubOrgName,
          teamId: repo.id,
          repoName: repo.name,
          metrics: metricsArray,
          values: valuesArray,
          types: typesArray,
          domains: domainsArray,
        });

        const savedDoc = await codeAnalysisData.save();
        console.log(
          `Successfully fetched and saved data for repo: ${repo.name}`
        );
        await getCompositeMetrics(compositeDataMap, repo, savedDoc._id);
        return;
      } catch (fetchError) {
        attempts++;
        if (attempts >= MAX_ATTEMPTS) {
          console.error(
            `Failed to fetch or save data for repo: ${repo.name} after ${attempts} attempts.`,
            fetchError
          );
          throw fetchError;
        }
        console.warn(
          `Retry attempt ${attempts} for repo: ${repo.name} failed. Retrying in ${
            DELAY / 1000
          } seconds...`
        );
        await new Promise(resolve => setTimeout(resolve, DELAY));
      }
    }
  } catch (error) {
    console.error(
      `Error fetching or saving data for repo: ${repo.name}`,
      error
    );
  }
};

const getCompositeMetrics = async (
  compositeDataMap: Map<string, number>,
  repo: any,
  codeAnalysisId: Types.ObjectId
) => {
  const compositeMetrics = new Map<string, string>();
  const teamData = await TeamDataModel.findOne({ teamId: repo.id });

  if (!teamData) return;

  // Commit Data
  if (teamData.commits && teamData.commits > 0) {
    for (const [key, value] of compositeDataMap.entries()) {
      if (key === 'bugs' || key === 'code_smells') {
        compositeMetrics.set(
          `${key}_per_commit`,
          (value / teamData.commits).toFixed(3)
        );
      } else if (key === 'ncloc') {
        compositeMetrics.set(
          'lines_per_commit',
          (value / teamData.commits).toFixed(3)
        );
      }
    }
  }

  // PR Data
  if (teamData.pullRequests && teamData.pullRequests > 0) {
    for (const [key, value] of compositeDataMap.entries()) {
      if (key === 'bugs' || key === 'code_smells') {
        compositeMetrics.set(
          `${key}_per_pr`,
          (value / teamData.pullRequests).toFixed(3)
        );
      } else if (key === 'ncloc') {
        compositeMetrics.set(
          'lines_per_pr',
          (value / teamData.pullRequests).toFixed(3)
        );
      }
    }
  }

  // Story Points Data
  const team = await TeamModel.findOne({ teamData: teamData._id }).populate({
    path: 'board',
    populate: {
      path: 'jiraIssues',
    },
  });

  if (team?.board?.jiraIssues && team.board.jiraIssues.length > 0) {
    const totalStoryPoints = team.board.jiraIssues.reduce((sum, issue) => {
      return sum + (issue.storyPoints || 0);
    }, 0);

    if (totalStoryPoints > 0 && compositeDataMap.has('ncloc')) {
      compositeMetrics.set(
        'lines_per_story_point',
        ((compositeDataMap.get('ncloc') ?? 0) / totalStoryPoints).toFixed(3)
      );
    }
  }

  // Append composite metrics to code analysis data
  const codeAnalysis = await codeAnalysisDataModel.findById(codeAnalysisId);
  if (!codeAnalysis) {
    console.error(`CodeAnalysis with ID ${codeAnalysisId} not found.`);
    return;
  }

  for (const [key, value] of compositeMetrics.entries()) {
    codeAnalysis.metrics.push(key);
    codeAnalysis.values.push(value.toString());
    codeAnalysis.types.push('FLOAT');
    codeAnalysis.domains.push('Composite');
  }

  await codeAnalysis.save();
  console.log(`Saved composite metrics for repo: ${repo.name}`);
};

const getMedianAndMeanCodeData = async (course: any) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // 2. Get the end of today:
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const codeAnalysisData = await codeAnalysisDataModel.find({
    gitHubOrgName: course.gitHubOrgName,
    repoName: { $regex: `^${course.repoNameFilter}` },
    executionTime: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });

  console.log(
    `Getting mean and median code analysis values for ${course.gitHubOrgName}, ${course.repoNameFilter} - ${codeAnalysisData.length} records`
  );

  if (codeAnalysisData.length === 0) return;

  const metricValues: { [key: string]: number[] } = {};

  codeAnalysisData.forEach(data => {
    data.metrics.forEach((metric, index) => {
      if (metric === 'quality_gate_details' || metric === 'alert_status')
        return;

      if (!metricValues[metric]) {
        metricValues[metric] = [];
      }

      const value = parseFloat(data.values[index]);
      if (!isNaN(value)) {
        metricValues[metric].push(value);
      }
    });
  });

  const metricStats: Map<string, { median: number; mean: number }> = new Map();

  Object.keys(metricValues).forEach(metric => {
    if (metricValues[metric].length === 0) {
      metricStats.set(metric, { median: 0, mean: 0 });
    } else {
      const values = metricValues[metric].sort((a, b) => a - b);
      const medianVal = median(values);
      const meanVal = mean(values);

      metricStats.set(metric, { median: medianVal, mean: meanVal });
    }
  });

  await Promise.all(
    codeAnalysisData.map(async data => {
      data.metricStats = metricStats;
      await data.save();
    })
  );
};

const getOverviewRankings = async (course: any) => {
  // Get distinct teamIds for the course
  const teamIds = await TeamDataModel.find({
    course: course._id,
  }).distinct('teamId');

  console.log(
    `Getting overview rankings for course: ${course.name}. Teams: ${teamIds.length}`
  );

  // Get the latest code analysis data for each team
  const courseAnalysisDocs = await codeAnalysisDataModel.aggregate([
    {
      $match: {
        teamId: { $in: teamIds },
      },
    },
    {
      $sort: {
        teamIds: 1,
        executionTime: -1,
      },
    },
    {
      $group: {
        _id: '$teamId',
        latestDoc: { $first: '$$ROOT' },
      },
    },
    {
      $replaceRoot: {
        newRoot: '$latestDoc',
      },
    },
  ]);

  // Calculate weighted sum of metrics for each team
  const overviewScores = getOverviewScores(courseAnalysisDocs);

  // Filter off teams with missing metrics and get rankings
  const scores = [...overviewScores.entries()]
    .filter(([_, score]) => score >= 0)
    .sort((a, b) => b[1] - a[1]);

  const totalScores = scores.length;

  for (let i = 0; i < scores.length; i++) {
    const [_id, score] = scores[i];

    const doc = await codeAnalysisDataModel.findById(_id);
    if (!doc) continue;

    if (doc.metrics.includes('overview_score')) {
      const index = doc.metrics.indexOf('overview_score');
      doc.values[index] = score.toString();
    } else {
      doc.metrics.push('overview_score');
      doc.values.push(score.toString());
      doc.types.push('FLOAT');
      doc.domains.push('Overview');
    }

    if (doc.metrics.includes('overview_rank')) {
      const index = doc.metrics.indexOf('overview_rank');
      doc.values[index] = (i + 1).toString();
    } else {
      doc.metrics.push('overview_rank');
      doc.values.push(`${i + 1}/${totalScores}`);
      doc.types.push('RANK');
      doc.domains.push('Overview');
    }

    await doc.save();
  }
};

interface OverviewMetrics {
  complexity?: number;
  duplicated_lines_density?: number;
  coverage?: number;
  security_rating?: number;
  reliability_rating?: number;
  sqale_rating?: number;
  alert_status?: number;
  bugs_per_commit?: number;
  lines_per_commit?: number;
  code_smells_per_commit?: number;
  bugs_per_pr?: number;
  lines_per_pr?: number;
  code_smells_per_pr?: number;
}

const getOverviewScores = (courseAnalysisDocs: any) => {
  const overviewMetricsMap = new Map<string, OverviewMetrics>();
  const complexityScores: number[] = [];

  for (const doc of courseAnalysisDocs) {
    const _id = doc._id;
    const teamMetrics: OverviewMetrics = {};

    for (const metric of OVERVIEW_METRICS) {
      const index = doc.metrics.indexOf(metric);
      if (index === -1) continue;
      if (metric === 'alert_status') {
        teamMetrics[metric] = doc.values[index] === 'ERROR' ? 0 : 1;
      } else {
        teamMetrics[metric as keyof OverviewMetrics] = parseFloat(
          doc.values[index]
        );
        if (metric === 'complexity') {
          complexityScores.push(parseFloat(doc.values[index]));
        }
      }
    }

    overviewMetricsMap.set(_id, teamMetrics);
  }

  const minComplexity = Math.min(...complexityScores);
  const maxComplexity = Math.max(...complexityScores);
  const minMaxComplexityDiff = maxComplexity - minComplexity;

  const overviewScores = new Map<string, number>();

  for (const [_id, metrics] of overviewMetricsMap.entries()) {
    // if any metric is missing, give negative score and skip
    if (Object.keys(metrics).length !== 13) {
      overviewScores.set(_id, -1);
      continue;
    }

    // Calculate total weighted sum of metrics
    let score = 0;
    for (const [metric, value] of Object.entries(metrics)) {
      switch (metric) {
        case 'complexity':
          score +=
            OVERVIEW_WEIGHTS.COMPLEXITY *
            (1 - (value - minComplexity) / minMaxComplexityDiff);
          break;
        case 'duplicated_lines_density':
          score +=
            OVERVIEW_WEIGHTS.DUPLICATED_LINES_DENSITY * (1 - value / 100);
          break;
        case 'coverage':
          score += (OVERVIEW_WEIGHTS.COVERAGE * value) / 100;
          break;
        case 'security_rating':
          score += OVERVIEW_WEIGHTS.SECURITY_RATING * getRatingsMapping(value);
          break;
        case 'reliability_rating':
          score +=
            OVERVIEW_WEIGHTS.RELIABILITY_RATING * getRatingsMapping(value);
          break;
        case 'sqale_rating':
          score += OVERVIEW_WEIGHTS.SQALE_RATING * getRatingsMapping(value);
          break;
        case 'alert_status':
          score += OVERVIEW_WEIGHTS.ALERT_STATUS * value;
          break;
        case 'bugs_per_commit':
          score += OVERVIEW_WEIGHTS.BUGS_PER_COMMIT * (1 / (1 + value));
          break;
        case 'lines_per_commit':
          score +=
            OVERVIEW_WEIGHTS.LINES_PER_COMMIT *
            (value > 50 ? Math.max(0, 1 - (value - 50) / 150) : 1.0);
          break;
        case 'code_smells_per_commit':
          score +=
            OVERVIEW_WEIGHTS.CODE_SMELLS_PER_COMMIT * (1 / (1 + 0.2 * value));
          break;
        case 'bugs_per_pr':
          score += OVERVIEW_WEIGHTS.BUGS_PER_PR * (1 / (1 + value));
          break;
        case 'lines_per_pr':
          score +=
            OVERVIEW_WEIGHTS.LINES_PER_PR *
            (value > 400 ? Math.max(0, 1 - (value - 400) / 600) : 1.0);
          break;
        case 'code_smells_per_pr':
          score +=
            OVERVIEW_WEIGHTS.CODE_SMELLS_PER_PR * (1 / (1 + 0.05 * value));
          break;
        default:
      }
    }
    overviewScores.set(_id, score);
  }

  return overviewScores;
};

export const setupCodeAnalysisJob = () => {
  // Schedule the job to run every day at midnight
  cron.schedule('0 2 * * *', async () => {
    console.log(
      'Running fetchAndSaveCodeAnalysisData job:',
      new Date().toString()
    );
    try {
      await fetchAndSaveCodeAnalysisData();
    } catch (err) {
      console.error('Error in cron job fetchAndSaveCodeAnalysisData:', err);
    }
  });

  // To run the job immediately for testing
  if (process.env.RUN_JOB_NOW === 'true') {
    console.log('Running fetchAndSaveCodeAnalysisData job');
    fetchAndSaveCodeAnalysisData().catch(err => {
      console.error('Error running job manually:', err);
    });
  }
};

export default setupCodeAnalysisJob;
