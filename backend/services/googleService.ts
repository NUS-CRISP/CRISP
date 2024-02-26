import SheetDataModel, { SheetData } from '../models/SheetData';
import { fetchDataFromSheet } from '../utils/google';
import { NotFoundError } from './errors';
import AssessmentModel from 'models/Assessment';

export const getAssessmentSheetData = async (
  assessmentId: string
): Promise<SheetData | null> => {
  const assessment = await AssessmentModel.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }
  const sheetId = assessment.sheetData;
  const latestData = await SheetDataModel.findById(sheetId);
  if (!latestData) {
    throw new NotFoundError('Sheets data not found');
  }
  return latestData;
};

export const fetchAndSaveSheetData = async (assessmentId: string) => {
  const assessment = await AssessmentModel.findById(assessmentId);
  if (!assessment) {
    throw new NotFoundError('Assessment not found');
  }

  const sheetId = assessment.sheetID;
  const transformedData = await fetchDataFromSheet(sheetId);
  const [headers, ...rows] = transformedData;

  const newSheetData = new SheetDataModel({
    fetchedAt: new Date(),
    headers,
    rows,
  });

  await newSheetData.save();
  assessment.sheetData = newSheetData._id;
  await assessment.save();
};
