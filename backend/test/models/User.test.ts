import mongoose, { ConnectOptions } from 'mongoose';
import UserModel from '../../models/User';
import { User } from '../../../shared/types/User';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('UserModel', () => {
  it('should create and save a new user', async () => {
    const userData: User = {
      name: 'John Doe',
      enrolledCourses: [],
      gitHandle: 'johndoe-git',
      orgId: 'e1234567',
    };

    const user = new UserModel(userData);

    const savedUser = await user.save();

    expect(savedUser.name).toEqual(userData.name);
    expect(savedUser.enrolledCourses).toEqual(userData.enrolledCourses);
    expect(savedUser.gitHandle).toEqual(userData.gitHandle);
  });

  it('should not save a user without required fields', async () => {
    const userData = {
      name: 'John Doe',
      enrolledCourses: [],
      gitHandle: 'johndoe-git',
    };

    const user = new UserModel(userData);

    await expect(user.save()).rejects.toThrow();
  });

  it('should update an existing user', async () => {
    const existingUser = new UserModel({
      name: 'Alice',
      enrolledCourses: [],
      gitHandle: 'alice-git',
    });

    await existingUser.save();

    const updatedUser = await UserModel.findByIdAndUpdate(
      existingUser._id,
      { name: 'Updated Alice' },
      { new: true }
    );

    expect(updatedUser?.name).toStrictEqual('Updated Alice');
  });

  it('should delete an existing user', async () => {
    const userToDelete = new UserModel({
      name: 'Bob',
      enrolledCourses: [],
      gitHandle: 'bob-git',
    });

    await userToDelete.save();

    const deletedUser = await UserModel.findByIdAndDelete(userToDelete._id);

    expect(deletedUser?._id).toStrictEqual(userToDelete._id);
  });

  it('should not save a user with a duplicate id', async () => {
    const user1 = new UserModel({
      name: 'John Doe',
      enrolledCourses: [],
      gitHandle: 'johndoe-git',
    });

    await user1.save();

    const user2 = new UserModel({
      name: 'Duplicate John',
      enrolledCourses: [],
      gitHandle: 'duplicate-git',
    });

    await expect(user2.save()).rejects.toThrow();
  });
});
