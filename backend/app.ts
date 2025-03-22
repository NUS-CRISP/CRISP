import cors from 'cors';
import { config } from 'dotenv';
import express, { Express } from 'express';
import setupCodeAnalysisJob from './jobs/codeAnalysisJob';
import setupGitHubJob from './jobs/githubJob';
import setupJiraJob from './jobs/jiraJob';
import setupTrofosJob from './jobs/trofosJob';
import accountRoutes from './routes/accountRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import internalAssessmentRoutes from './routes/internalAssessmentRoutes';
import courseRoutes from './routes/courseRoutes';
import githubRoutes from './routes/githubRoutes';
import jiraRoutes from './routes/jiraRoutes';
import metricRoutes from './routes/metricRoutes';
import teamRoutes from './routes/teamRoutes';
import teamSetRoutes from './routes/teamSetRoutes';
import userRoutes from './routes/userRoutes';
import codeAnalysisRoutes from './routes/codeAnalysisRoutes';
import { connectToDatabase } from './utils/database';
import submissionRoutes from './routes/submissionRoutes';
import assessmentAssignmentSetRoutes from './routes/assessmentAssignmentSetRoutes';
import assessmentResultRoutes from './routes/assessmentResultRoutes';
import setupAIInsightsJob from './jobs/aiInsightsJob';
import notificationRoutes from './routes/notificationRoutes';
import setupTutorialDataJob from './jobs/tutorialDataJob';
import setupNotificationJob from './jobs/notificationJob';
import setupDataIntegrityJob from 'jobs/dataIntegrityJob';

const env = process.env.NODE_ENV ?? 'development';
config({ path: `.env.${env}` });

const setupApp = async () => {
  await connectToDatabase();
  setupGitHubJob();
  setupJiraJob();
  setupTrofosJob();
  setupCodeAnalysisJob();
  setupAIInsightsJob();
  setupNotificationJob();
  setupTutorialDataJob();
  setupDataIntegrityJob();
};
setupApp();

const port = process.env.PORT || 3001;
const app: Express = express();

app.use(express.json());

app.use(cors());

app.use('/api/courses', courseRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/teamsets', teamSetRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/internal-assessments', internalAssessmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/jira', jiraRoutes);
app.use('/api/metrics', metricRoutes);
app.use('/api/user', userRoutes);
app.use('/api/assessment-results', assessmentResultRoutes);
app.use('/api/assignment-sets', assessmentAssignmentSetRoutes);
app.use('/api/codeanalysis', codeAnalysisRoutes);
app.use('/api/notifications', notificationRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
