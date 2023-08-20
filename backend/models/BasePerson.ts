import mongoose, { Schema } from 'mongoose';

export interface BasePerson {
  name: string;
  email: string;
}

export const basePersonSchema = new Schema<BasePerson>({
  name: { type: String, required: true },
  email: { type: String, required: true },
});


const BasePersonModel = mongoose.model<BasePerson>('BasePerson', basePersonSchema);

export default BasePersonModel;