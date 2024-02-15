import { TransformedData } from '@shared/types/SheetsData';
import SheetsDataModel, { SheetsData } from '../models/SheetsData';
import { fetchDataFromSheets } from '../utils/google';
import CourseModel from '../models/Course';
import { NotFoundError } from './errors';
import { Assessment } from 'models/Assessment';

export const getCourseSheetsData = async (
  courseId: string
): Promise<SheetsData | null> => {
  const course = await CourseModel.findById(courseId);
  if (!course) {
    throw new NotFoundError('Course not found');
  }
  const sheetsId = course.sheetsData;
  const latestData = await SheetsDataModel.findById(sheetsId);
  if (!latestData) {
    throw new NotFoundError('Sheets data not found');
  }
  return latestData;
};

export const fetchAndSaveSheetsData = async (
  courseId: string,
  joinOnColumn: string
) => {
  const course = await CourseModel.findById(courseId).populate('assessments');
  if (!course) {
    throw new NotFoundError('Course not found');
  }

  const sheetsId: string[] = course.assessments.map(
    assessment => (assessment as unknown as Assessment).sheetID
  );

  const transformedData: TransformedData = await fetchDataFromSheets(
    sheetsId,
    joinOnColumn
  );
  const [headers, ...rows] = transformedData;

  const newSheetsData = new SheetsDataModel({
    fetchedAt: new Date(),
    headers,
    rows,
  });

  await newSheetsData.save();
  course.sheetsData = newSheetsData._id;
  await course.save();
};
