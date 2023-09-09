import mongoose, { Schema, Document } from 'mongoose';

export interface User extends Document {
  id: string;
  name: string;
  email: string;
  enrolledCourses: mongoose.Types.ObjectId[];
  gitHandle: string;
  role: 'student' | 'assistant' | 'lecturer';
}

export const userSchema = new Schema<User>({
  id: { type: String, unique : true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  gitHandle: { type: String },
  role: { type: String, required: true }
});


const UserModel = mongoose.model<User>('User', userSchema);

export default UserModel;