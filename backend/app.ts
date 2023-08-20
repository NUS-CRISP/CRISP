import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { connectToDatabase } from './database/database';
import courseRoutes from './routes/courseRoutes';

dotenv.config();
connectToDatabase();

const port = process.env.PORT;
const app: Express = express();

app.use(express.json());
app.get('/', (req: Request, res: Response) => {
  res.send('hello world');
});

// Use the course routes
app.use('api/courses', courseRoutes);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});