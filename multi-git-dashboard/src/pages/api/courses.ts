import clientPromise from '@/lib/mongodb';
import type { WithId, Document, ObjectId } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';

interface Course extends WithId<Document> {
  courseName: string;
  courseCode: string;
  faculty: ObjectId[];
  tas: ObjectId[];
  students: ObjectId[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WithId<Course>[]>
) {
  // Fetch courses from local mongodb
  const client = await clientPromise;
  const coursesCollection = client
    .db(process.env.DB_NAME)
    .collection<Course>('courses');
  const courses = await coursesCollection.find().toArray();
  res.status(200).json(courses);
}
