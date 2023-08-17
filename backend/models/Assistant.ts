import mongoose, { Schema } from 'mongoose';
import {basePersonSchema, BasePerson } from './BasePerson';

interface Assistant extends BasePerson {
  isHeadAssistant : boolean;
}

const assistantSchema = new Schema<Assistant>({
  ...basePersonSchema.obj,
  isHeadAssistant: { type: Boolean, required: true }
});

export {assistantSchema, Assistant};