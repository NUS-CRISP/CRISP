import mongoose, { Document, Schema } from 'mongoose';

export interface User extends Document{
  name: string;
  email: string;
}

export const userSchema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true },
});


const UserModel = mongoose.model<User>('User', userSchema);

export default UserModel;