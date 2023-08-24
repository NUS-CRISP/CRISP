import { NextApiRequest, NextApiResponse } from 'next';
import axios, { AxiosError } from 'axios';

const backendPort = process.env.BACKEND_PORT || 3001;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const response = await axios.post('http://localhost:${backendPort}/api/courses', req.body);
      res.status(response.status).json(response.data);
    } catch (error) {
      if (error instanceof AxiosError) {
        res.status(error.response?.status || 500).json(error.response?.data);
      } else {
        res.status(500).json({ error: 'Unexpected error creating courses' });
      }
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}