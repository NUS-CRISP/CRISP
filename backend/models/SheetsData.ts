import { SheetsData as SharedSheetsData } from '@shared/types/SheetsData';
import mongoose, { Schema, Types } from 'mongoose';

export interface SheetsData extends Omit<SharedSheetsData, '_id'>, Document {
  _id: Types.ObjectId;
}

const sheetsDataSchema: Schema = new Schema<SheetsData>({
  fetchedAt: { type: Date, required: true },
  headers: { type: [String], required: true },
  rows: { type: [[String]], required: true },
});

const SheetsDataModel = mongoose.model<SheetsData>(
  'SheetsData',
  sheetsDataSchema
);

export default SheetsDataModel;
