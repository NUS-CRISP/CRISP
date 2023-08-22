import mongoose, { Document, Schema } from 'mongoose';

export interface User extends Document{
  name: string;
  email: string;
  id: string;
  course_student: mongoose.Types.ObjectId[];
  course_teaching: mongoose.Types.ObjectId[];
}

export const userSchema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  id: { type: String, required: true},
  course_student: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
  course_teaching: [{ type: Schema.Types.ObjectId, ref: 'Course' }]
});


const UserModel = mongoose.model<User>('User', userSchema);

export default UserModel;