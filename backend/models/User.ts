import { User as SharedUser } from '@shared/types/User';
import mongoose, { Schema, Types } from 'mongoose';

export interface User
  extends Omit<SharedUser, '_id' | 'enrolledCourses'>,
    Document {
  _id: Types.ObjectId;
  enrolledCourses: Types.ObjectId[];
}

export const userSchema = new Schema<User>({
  identifier: { type: String, unique: true },
  name: { type: String, required: true },
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  gitHandle: { type: String },
});

const UserModel = mongoose.model<User>('User', userSchema);

export default UserModel;
