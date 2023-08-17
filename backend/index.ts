import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';

dotenv.config({path: '../.env'});

const app: Express = express();
const port = 5000;

app.get('/', (req: Request, res: Response) => {
  res.send('hello world');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
