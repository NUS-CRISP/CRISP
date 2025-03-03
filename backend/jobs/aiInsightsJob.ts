import { GoogleGenerativeAI } from '@google/generative-ai';
import codeAnalysisDataModel from '@models/CodeAnalysisData';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';

const filePath = path.join(__dirname, 'results.txt');
fs.writeFileSync(filePath, '', 'utf8');
let isLocked = false;

const token = process.env.AI_TOKEN;
if (!token) {
  throw new Error('AI token not found');
}
const genAI = new GoogleGenerativeAI(
  token
);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

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

const getAIInsights = async () => {
  const startOfDay = new Date('2025-02-03');
  startOfDay.setHours(0, 0, 0, 0);

  // 2. Get the end of today:
  const endOfDay = new Date('2025-02-03');
  endOfDay.setHours(23, 59, 59, 999);

  const codeAnalysisData = await codeAnalysisDataModel.find({
    gitHubOrgName: 'cs4218',
    repoName: { $regex: '^cs4218-project-2024' },
    executionTime: { $gte: startOfDay, $lte: endOfDay },
  });

  codeAnalysisData.forEach(async data => {
    await processData(data);
  });
};

async function processData(data: any) {
  while (isLocked) {
    // console.log('Waiting for lock to be released...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
  }

  isLocked = true; // Acquire lock

  try {
    const { repoName, metrics, values, types, domains, metricStats } = data;

    const prompt = `${header} \n\n\
    ${context} \n\n\
    Example Output: \n${exampleOutput} \n\n\
    Metrics: \n${JSON.stringify(metrics)} \n\n\
    Values: \n${JSON.stringify(values)} \n\n\
    Types: \n${JSON.stringify(types)} \n\n\
    Domains: \n${JSON.stringify(domains)} \n\n\
    Metric Stats: \n${JSON.stringify(metricStats)}`;

    const result = await model.generateContent(prompt);
    const output = `Repository: ${repoName}\nResult: ${result.response.text()}\n\n`;

    fs.appendFile(filePath, output, (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log(`Data for ${repoName} saved.`);
      }
    });

    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error(`Error processing ${data.repoName}:`, error);
  } finally {
    isLocked = false; // Release lock
  }
}

export const setupAIInsightsJob = () => {
  // Schedule the job to run every day at midnight
  cron.schedule('0 3 * * *', async () => {
    console.log('Running getAIInsights job:', new Date().toString());
    try {
      await getAIInsights();
    } catch (err) {
      console.error('Error in cron job getAIInsights:', err);
    }
  });

  // To run the job immediately for testing
  // if (process.env.RUN_JOB_NOW === 'true') {
  console.log('Running getAIInsights job');
  getAIInsights().catch(err => {
    console.error('Error running job manually:', err);
  });
  // }
};

export default setupAIInsightsJob;
