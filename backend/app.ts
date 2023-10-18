import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './database/database';
import accountRoutes from './routes/accountRoutes';
import courseRoutes from './routes/courseRoutes';
import githubRoutes from './routes/githubRoutes';
import teamRoutes from './routes/teamRoutes';
import teamSetRoutes from './routes/teamSetRoutes';
import { setupJob } from './jobs/githubJob';

dotenv.config();
connectToDatabase();
setupJob();

const port = process.env.PORT;
const app: Express = express();
app.use(express.json());

const corsOptions = {
  origin: ['http://localhost:3000', 'http://strand-i.comp.nus.edu.sg:3000'],
};
app.use(cors(corsOptions));

app.use('/api/courses', courseRoutes);
app.use('/api/github', githubRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/teamsets', teamSetRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
