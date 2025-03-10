import { GoogleGenerativeAI } from '@google/generative-ai';
import codeAnalysisDataModel from '@models/CodeAnalysisData';
import cron from 'node-cron';
import { App } from 'octokit';
import { getGitHubApp } from '../utils/github';
import CourseModel from '@models/Course';
import { OpenAI } from 'openai';

let isLocked = false;

const header =
  'Imagine you are a professor assessing the code quality of software engineering student teams. You wish to quickly identify positives, areas for improvements and struggling teams. Generate some high-level insights on code quality, project mangement, agile principles and practices, and software development best practices based on the information given below. Do not focus on single metrics, rather look at the overall picture. Generate up to 3 recommendations based on the insights.';

const context =
  'There are 4 arrays: metrics, values, types, and domains. The indexes of the arrays correspond to each other. \
  For example, if metrics[0] is bugs, the value for bugs would be values[0], which is of type types[0] and under the domain of domain[0]. \
  For type "RATINGS", 1 is the best rating and 6 is the worst. \
  The mean and median of each metric can be found in the metricStats object, which is a map of metric: {mean, median}. This can be used as a benchmark for the metrics. \
  Ignore any metrics that are in the metricStats object but not in the metrics array.\
  Format the output as a list of insights, under the category (code quality, project management, agile principles and practices, software development best practices) as per the example below. Use the same language as the example output.';

const exampleOutput =
  'Code Quality: \n\
  - The large ncloc and function indicates that the codebase is potentially too large and needs refactoring. \n\
  - The high number of code smells and duplicated lines indicates that the codebase is not well maintained. \n\
  Project Management: \n\
  - The high number of lines per story point indicates that the team is not estimating story points correctly. \n\
  Agile Principles and Practices: \n\
  - The high number of bugs per commit indicates that the team is not writing enough tests. \n\
  - The high number of lines per commit indicates that the team is not committing often enough. \n\
  Software Development Best Practices: \n\
  - The low line coverage indicates that the team is not writing enough tests.\n\
  Recommendations: \n\
  - The team should focus on writing more tests to improve code quality. \n\
  - The team should refactor the codebase to reduce the number of code smells and duplicated lines.';

const queryAndSaveAIInsights = async () => {
  const app: App = getGitHubApp();
  const octokit = app.octokit;

  const response = await octokit.rest.apps.listInstallations();
  const installationIds = response.data.map(installation => installation.id);

  const courses = await CourseModel.find({
    installationId: { $in: installationIds },
  });

  await Promise.all(
    courses.map(async course => {
      // Query only if course has CRISP installed and AI insights enabled
      if (
        course &&
        course.installationId &&
        course.aiInsights &&
        course.aiInsights.isOn
      ) {
        await getAIInsights(course);
      }
    })
  );

  console.log('Code analysis data fetched');
};

const getAIInsights = async (course: any) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Get the latest code analysis data for all teams the course
  const codeAnalysisData = await codeAnalysisDataModel.find({
    gitHubOrgName: course.gitHubOrgName,
    repoName: { $regex: `^${course.repoNameFilter as string}` },
    executionTime: { $gte: startOfDay, $lte: endOfDay },
  });

  codeAnalysisData.forEach(async teamCodeAnalysisData => {
    await processData(teamCodeAnalysisData);
  });
};

async function processData(data: any) {
  while (isLocked) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
  }

  isLocked = true; // Acquire lock

  try {
    const { metrics, values, types, domains, metricStats, aiInsights } = data;

    const prompt = `${header} \n\n\
    ${context} \n\n\
    Example Output: \n${exampleOutput} \n\n\
    Metrics: \n${JSON.stringify(metrics)} \n\n\
    Values: \n${JSON.stringify(values)} \n\n\
    Types: \n${JSON.stringify(types)} \n\n\
    Domains: \n${JSON.stringify(domains)} \n\n\
    Metric Stats: \n${JSON.stringify(metricStats)}`;

    const result = await generateResult(prompt, aiInsights);

    data.aiInsights = result;
    await data.save();

    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait for 30s to avoid rate limiting
  } catch (error) {
    console.error(`Error processing ${data.repoName}:`, error);
  } finally {
    isLocked = false; // Release lock
  }
}

const generateResult = async (prompt: string, aiInsights: any) => {
  const { provider, model, apiKey } = aiInsights;

  let result = '';

  if (provider === 'Gemini') {
    result = await generateGemini(prompt, model, apiKey);
  } else if (provider === 'OpenAI') {
    if (!model || !apiKey) {
      throw new Error('OpenAI model or API key not found');
    }
    result = await generateOpenAI(prompt, model, apiKey, false);
  } else if (provider === 'DeepSeek') {
    if (!model || !apiKey) {
      throw new Error('DeepSeek model or API key not found');
    }
    result = await generateOpenAI(prompt, model, apiKey, true);
  } else if (!provider) {
    result = await generateGemini(prompt);
  } else {
    throw new Error('AI provider not found');
  }

  return result;
};

const generateGemini = async (
  prompt: string,
  model?: string,
  apiKey?: string
) => {
  if (!model) model = 'gemini-1.5-pro';
  if (!apiKey) {
    apiKey = process.env.AI_TOKEN;
    if (!apiKey) {
      throw new Error('AI token not found');
    }
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const AImodel = genAI.getGenerativeModel({ model: model });

  const result = await AImodel.generateContent(prompt);

  return result.response.text();
};

const generateOpenAI = async (
  prompt: string,
  model: string,
  apiKey: string,
  isDeepSeek: boolean
) => {
  let openai;
  if (!isDeepSeek) {
    openai = new OpenAI({
      apiKey: apiKey,
    });
  } else {
    openai = new OpenAI({
      baseURL: 'https://api.deepseek.com',
      apiKey: apiKey,
    });
  }

  try {
    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = response.choices[0].message.content;

    if (!result) {
      throw new Error(
        `Empty response from ${isDeepSeek ? 'DeepSeek' : 'OpenAI'}`
      );
    }
    return result;
  } catch (error) {
    console.error(
      `Error generating ${isDeepSeek ? 'DeepSeek' : 'OpenAI'} response:`,
      error
    );
    throw error;
  }
};

export const setupAIInsightsJob = () => {
  // Schedule the job to run every day at midnight
  cron.schedule('0 3 * * *', async () => {
    console.log('Running queryAndSaveAIInsights job:', new Date().toString());
    try {
      await queryAndSaveAIInsights();
    } catch (err) {
      console.error('Error in cron job getAIInsights:', err);
    }
  });

  // To run the job immediately for testing
  // if (process.env.RUN_JOB_NOW === 'true') {
  console.log('Running getAIInsights job');
  queryAndSaveAIInsights().catch(err => {
    console.error('Error running job manually:', err);
  });
  // }
};

export default setupAIInsightsJob;
