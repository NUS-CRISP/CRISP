import mongoose from 'mongoose';

export const connectToDatabase = async () => {
  const uri = process.env.MONGODB_URI;
  const options = {};

  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  try {
    await mongoose.connect(uri, options);
    console.log('Successfully connected to MongoDB');
  } catch (error) {
    console.log('Error connecting to MongoDB: ', error);
  }
};
