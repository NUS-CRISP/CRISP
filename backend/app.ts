import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './database/database';
import courseRoutes from './routes/courseRoutes';
import githubRoutes from './routes/githubRoutes';
import { setupJobs } from './jobs/jobs';

dotenv.config();
connectToDatabase();
setupJobs();

const port = process.env.PORT;
const app: Express = express();
app.use(express.json());

const corsOptions = {
  origin: ['http://localhost:3000'],
};
app.use(cors(corsOptions));

app.use('/api/courses', courseRoutes);
app.use('/api/github', githubRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});