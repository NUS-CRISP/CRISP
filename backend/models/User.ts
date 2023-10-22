import mongoose, { Schema } from 'mongoose';

export interface User {
  name: string;
  enrolledCourses: mongoose.Types.ObjectId[];
  gitHandle: string;
}

export const userSchema = new Schema<User>({
  name: { type: String, required: true },
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  gitHandle: { type: String },
});

const UserModel = mongoose.model('User', userSchema);

export default UserModel;
