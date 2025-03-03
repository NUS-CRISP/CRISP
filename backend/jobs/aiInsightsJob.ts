import { GoogleGenerativeAI } from '@google/generative-ai';

const getAIInsights = async () => {
  const genAI = new GoogleGenerativeAI('AIzaSyB2bXFaNfYTLqifuZTpdOVCGWo9WFMO-C4');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const startOfDay = new Date('2025-02-03');
  startOfDay.setHours(0, 0, 0, 0);

  // 2. Get the end of today:
  const endOfDay = new Date('2025-02-03');
  endOfDay.setHours(23, 59, 59, 999);


};

const header =
  'Imagine you are a professor assessing the code quality of software engineering student teams. You wish to quickly identify positives, areas for improvements and struggling teams. Generate some high-level insights on code quality, project mangement, agile principles and practices, and software development best practices based on the information given below. Do not focus on single metrics, rather look at the overall picture. Generate up to 3 recommendations based on the insights.';

const metrics = [
  'complexity',
  'duplicated_lines_density',
  'duplicated_lines',
  'functions',
  'security_remediation_effort',
  'classes',
  'statements',
  'quality_gate_details',
  'sqale_index',
  'sqale_rating',
  'bugs',
  'duplicated_files',
  'ncloc',
  'reliability_remediation_effort',
  'line_coverage',
  'lines',
  'coverage',
  'reliability_rating',
  'code_smells',
  'security_rating',
  'sqale_debt_ratio',
  'comment_lines_density',
  'security_hotspots',
  'alert_status',
  'comment_lines',
  'uncovered_lines',
  'cognitive_complexity',
  'duplicated_blocks',
  'files',
  'vulnerabilities',
  'bugs_per_commit',
  'lines_per_commit',
  'code_smells_per_commit',
  'bugs_per_pr',
  'lines_per_pr',
  'code_smells_per_pr',
  'lines_per_story_point',
];

const values = [
  '424',
  '7.0',
  '394',
  '276',
  '0',
  '4',
  '1115',
  '{"level":"OK","conditions":[{"metric":"new_violations","op":"GT","period":1,"error":"0","actual":"0","level":"OK"}],"ignoredConditions":false}',
  '465',
  '1.0',
  '7',
  '8',
  '4956',
  '23',
  '0.0',
  '5646',
  '0.0',
  '4.0',
  '117',
  '1.0',
  '0.3',
  '6.1',
  '4',
  'OK',
  '320',
  '1099',
  '216',
  '17',
  '81',
  '0',
  '0.143',
  '101.143',
  '2.388',
  '0.241',
  '170.897',
  '4.034',
  '59.000',
];
const types = [
  'INT',
  'PERCENT',
  'INT',
  'INT',
  'WORK_DUR',
  'INT',
  'INT',
  'DATA',
  'WORK_DUR',
  'RATING',
  'INT',
  'INT',
  'INT',
  'WORK_DUR',
  'PERCENT',
  'INT',
  'PERCENT',
  'RATING',
  'INT',
  'RATING',
  'PERCENT',
  'PERCENT',
  'INT',
  'LEVEL',
  'INT',
  'INT',
  'INT',
  'INT',
  'INT',
  'INT',
  'FLOAT',
  'FLOAT',
  'FLOAT',
  'FLOAT',
  'FLOAT',
  'FLOAT',
  'FLOAT',
];
const domains = [
  'Complexity',
  'Duplications',
  'Duplications',
  'Size',
  'Security',
  'Size',
  'Size',
  'General',
  'Maintainability',
  'Maintainability',
  'Reliability',
  'Duplications',
  'Size',
  'Reliability',
  'Coverage',
  'Size',
  'Coverage',
  'Reliability',
  'Maintainability',
  'Security',
  'Maintainability',
  'Size',
  'SecurityReview',
  'Releasability',
  'Size',
  'Coverage',
  'Complexity',
  'Duplications',
  'Size',
  'Security',
  'Composite',
  'Composite',
  'Composite',
  'Composite',
  'Composite',
  'Composite',
  'Composite',
];

const metricStats = {
  complexity: {
    median: 476,
    mean: 522.8888888888889,
  },
  duplicated_lines_density: {
    median: 9.4,
    mean: 12.38,
  },
  duplicated_lines: {
    median: 564,
    mean: 1321.6444444444444,
  },
  functions: {
    median: 322,
    mean: 368.5111111111111,
  },
  security_remediation_effort: {
    median: 30,
    mean: 27.333333333333332,
  },
  classes: {
    median: 0,
    mean: 0.08888888888888889,
  },
  statements: {
    median: 1368,
    mean: 1535.9333333333334,
  },
  sqale_index: {
    median: 472,
    mean: 2759.866666666667,
  },
  sqale_rating: {
    median: 1,
    mean: 1.0222222222222221,
  },
  bugs: {
    median: 5,
    mean: 7,
  },
  duplicated_files: {
    median: 11,
    mean: 14.466666666666667,
  },
  ncloc: {
    median: 5136,
    mean: 6405.333333333333,
  },
  reliability_remediation_effort: {
    median: 13,
    mean: 18.044444444444444,
  },
  line_coverage: {
    median: 0,
    mean: 1.1422222222222222,
  },
  lines: {
    median: 5990,
    mean: 7418.488888888889,
  },
  coverage: {
    median: 0,
    mean: 1.211111111111111,
  },
  reliability_rating: {
    median: 4,
    mean: 3.977777777777778,
  },
  code_smells: {
    median: 135,
    mean: 583.5777777777778,
  },
  security_rating: {
    median: 5,
    mean: 4.644444444444445,
  },
  sqale_debt_ratio: {
    median: 0.3,
    mean: 0.7488888888888889,
  },
  comment_lines_density: {
    median: 6.9,
    mean: 6.651111111111112,
  },
  security_hotspots: {
    median: 2,
    mean: 6.355555555555555,
  },
  comment_lines: {
    median: 383,
    mean: 428.46666666666664,
  },
  uncovered_lines: {
    median: 1350,
    mean: 1504.5555555555557,
  },
  cognitive_complexity: {
    median: 218,
    mean: 216.6,
  },
  duplicated_blocks: {
    median: 26,
    mean: 153.6888888888889,
  },
  files: {
    median: 80,
    mean: 85.15555555555555,
  },
  vulnerabilities: {
    median: 1,
    mean: 0.9111111111111111,
  },
  bugs_per_commit: {
    median: 0.5625,
    mean: 1.3300227272727272,
  },
  lines_per_commit: {
    median: 563.95,
    mean: 1324.0007272727273,
  },
  code_smells_per_commit: {
    median: 18.0805,
    mean: 65.55856818181817,
  },
  bugs_per_pr: {
    median: 0.7735,
    mean: 1.8510000000000002,
  },
  lines_per_pr: {
    median: 838.85,
    mean: 1652.213411764706,
  },
  code_smells_per_pr: {
    median: 21.0355,
    mean: 132.84270588235293,
  },
  lines_per_story_point: {
    median: 259.568,
    mean: 447.095875,
  },
  uncovered_conditions: {
    median: 22,
    mean: 22,
  },
  branch_coverage: {
    median: 81.8,
    mean: 81.8,
  },
};

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

const prompt = `${header} \n\n\
${context} \n\n\
Example Output: \n${exampleOutput} \n\n\
Metrics: \n${JSON.stringify(metrics)} \n\n\
Values: \n${JSON.stringify(values)} \n\n\
Types: \n${JSON.stringify(types)} \n\n\
Domains: \n${JSON.stringify(domains)} \n\n\
Metric Stats: \n${JSON.stringify(metricStats)}`;

async function generateAIContent() {
  const result = await model.generateContent(prompt);
  console.log(result.response.text());
  // console.log(prompt);
}

generateAIContent();
