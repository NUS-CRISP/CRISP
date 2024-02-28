import cors from 'cors';
import { config } from 'dotenv';
import express, { Express } from 'express';
import { setupJob } from './jobs/githubJob';
import accountRoutes from './routes/accountRoutes';
import assessmentRoutes from './routes/assessmentRoutes';
import courseRoutes from './routes/courseRoutes';
import githubRoutes from './routes/githubRoutes';
import metricRoutes from './routes/metricRoutes';
import teamRoutes from './routes/teamRoutes';
import teamSetRoutes from './routes/teamSetRoutes';
import { connectToDatabase } from './utils/database';
import userRoutes from './routes/userRoutes';

const env = process.env.NODE_ENV ?? 'development';
config({ path: `.env.${env}` });

const setupApp = async () => {
  await connectToDatabase();
  setupJob();
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
app.use('/api/metrics', metricRoutes);
app.use('/api/user', userRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
