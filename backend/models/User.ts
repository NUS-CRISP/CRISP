import mongoose, { Schema } from 'mongoose';

export interface User {
  name: string;
  identifier: string;
  enrolledCourses: mongoose.Types.ObjectId[];
  gitHandle: string;
  role: string;
}

export const userSchema = new Schema({
  name: { type: String, required: true },
  identifier: { type: String, required: true, unique: true },
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  gitHandle: { type: String },
  role: {
    type: String,
    enum: ['Faculty member', 'Teaching assistant', 'Student'],
  },
});

const UserModel = mongoose.model('User', userSchema);

export default UserModel;
