import CourseModel from '@models/Course';
import cron from 'node-cron';
import { App, Octokit } from 'octokit';
import { getGitHubApp } from '../utils/github';
import * as fs from 'fs';
import * as path from 'path';

const { exec } = require('child_process');

const fetchAndSaveCodeAnalysisData = async () => {
  const app: App = getGitHubApp();
  const octokit = app.octokit;

  const response = await octokit.rest.apps.listInstallations();
  const installationIds = response.data.map(installation => installation.id);

  const courses = await CourseModel.find({
    installationId: { $in: installationIds },
  });

  await Promise.all(
    courses.map(async course => {
      if (course && course.installationId) {
        const installationOctokit = await app.getInstallationOctokit(
          course.installationId
        );
        await getCourseCodeData(installationOctokit, course);
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

    await getLatestCommit(gitHubOrgName, repo.name);

    await scanRepo(gitHubOrgName, repo.name, buildTool);
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

    if (searchResult.components.length > 0) {
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

const getLatestCommit = async (gitHubOrgName: string, repoName: string) => {
  try {
    const repoPath = path.join(
      process.env.REPO_PATH || '',
      gitHubOrgName,
      repoName
    );

    if (!fs.existsSync(repoPath)) {
      console.log(`Cloning repository ${repoName}...`);
      await execShellCommand(
        `git clone https://github.com/${gitHubOrgName}/${repoName}.git ${repoPath}`
      );
    } else {
      await execShellCommand(`git -C ${repoPath} pull`);
    }
  } catch (error) {
    console.error(
      `Error updating repository ${repoName}: ${(error as Error).message}`
    );
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

export const setupCodeAnalysisJob = () => {
  // Schedule the job to run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running fetchAndSaveCodeAnalysisData job:', new Date().toString());
    try {
      await fetchAndSaveCodeAnalysisData();
    } catch (err) {
      console.error('Error in cron job fetchAndSaveCodeAnalysisData:', err);
    }
  });

  // To run the job immediately for testing
  if (process.env.RUN_JOB_NOW === 'true') {
    console.log('Running fetchAndSaveCodeAnalysisData job:', new Date().toString());
    fetchAndSaveCodeAnalysisData().catch(err => {
      console.error('Error running job manually:', err);
    });
  }
};

export default setupCodeAnalysisJob;
