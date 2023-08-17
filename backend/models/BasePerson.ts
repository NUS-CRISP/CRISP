import mongoose, { Document, Schema } from 'mongoose';

interface BasePerson extends Document {
  name: string;
  email: string;
}

const basePersonSchema = new Schema<BasePerson>({
  name: { type: String, required: true },
  email: { type: String, required: true },
});


export {basePersonSchema, BasePerson};