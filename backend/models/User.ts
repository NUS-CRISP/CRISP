import mongoose, { Schema } from 'mongoose';

export interface User {
  _id: string;
  name: string;
  email: string;
}

export const userSchema = new Schema<User>({
  _id: { type: String, required: true},
  name: { type: String, required: true },
  email: { type: String, required: true },
});


const UserModel = mongoose.model<User>('User', userSchema);

export default UserModel;