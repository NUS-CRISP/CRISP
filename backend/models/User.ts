import mongoose, { Schema, Types } from 'mongoose';

export interface User {
  id: string;
  name: string;
  email: string;
  enrolledCourses: mongoose.Types.ObjectId[];
}

export const userSchema = new Schema<User>({
  id: { type: String, unique : true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }]
});


const UserModel = mongoose.model<User>('User', userSchema);

export default UserModel;