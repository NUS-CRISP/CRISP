import mongoose, { Schema } from 'mongoose';

export interface User {
  id: string;
  name: string;
  email: string;
  enrolledCourses: mongoose.Types.ObjectId[];
  gitHandle: string;
  role: 'student' | 'assistant' | 'lecturer';
}

export const userSchema = new Schema<User>({
  id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  gitHandle: { type: String },
  role: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => ['student', 'assistant', 'lecturer'].includes(value),
      message: 'Invalid role. Must be one of: student, assistant, lecturer',
    },
  },
});


const UserModel = mongoose.model<User>('User', userSchema);

export default UserModel;
