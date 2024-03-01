import { SheetData as SharedSheetData } from '@shared/types/SheetData';
import mongoose, { Schema, Types } from 'mongoose';

export interface SheetData extends Omit<SharedSheetData, '_id'>, Document {
  _id: Types.ObjectId;
}

const sheetDataSchema: Schema = new Schema<SheetData>({
  fetchedAt: { type: Date, required: true },
  headers: { type: [String], required: true },
  rows: { type: [[String]], required: true },
});

const SheetDataModel = mongoose.model<SheetData>('SheetData', sheetDataSchema);

export default SheetDataModel;
