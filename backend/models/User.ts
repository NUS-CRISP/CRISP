import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface User extends Document{
  email: string;
  username: string;
  password: string;
  created_at: Date;
  name: string;
}

const userSchema = new Schema<User>({
  email: { 
    type: String, 
    required: [true, "Your email address is required"] ,
    unique: true,
  },
  username: { 
    type: String, 
    required: [true, "Your username is required"],
  },
  password: {
    type: String,
    required: [true, "Your password is required"],
  },
  created_at: { 
    type: Date, 
    default: Date.now 
  },
  name: { 
    type: String, 
    required: true 
  },
});

userSchema.pre<User>('save', async function() {
  this.password = await bcrypt.hash(this.password, 12);
});

const User = mongoose.model<User>('User', userSchema);

export default User;