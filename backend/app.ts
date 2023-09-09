import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './database/database';
import assessmentRoutes from './routes/assessmentRoutes';
import courseRoutes from './routes/courseRoutes';
import userRoutes from './routes/userRoutes';

dotenv.config();
connectToDatabase();

const port = process.env.PORT;
const app: Express = express();
app.use(express.json());

const corsOptions = {
  origin: ['http://localhost:3000'], 
};
app.use(cors(corsOptions));

app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assessment', assessmentRoutes);


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});