import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectToDatabase } from './database/database';
import courseRoutes from './routes/courseRoutes';

dotenv.config();
connectToDatabase();

const port = process.env.PORT;
const app: Express = express();
app.use(express.json());

const corsOptions = {
  origin: ['http://localhost:3000'], // List of allowed origins
};
app.use(cors(corsOptions));



// Use the course routes
app.use('/api/courses', courseRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});