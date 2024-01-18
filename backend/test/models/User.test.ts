import mongoose, { ConnectOptions, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import UserModel from '../../models/User';
import CourseModel from '../../models/Course';
import { CourseType } from '@shared/types/Course';

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
  await CourseModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('UserModel', () => {
  it('should create and save a new user', async () => {
    const userData: any = {
      identifier: 'user001',
      name: 'John Doe',
      enrolledCourses: [],
      gitHandle: 'johndoe',
    };

    const user = new UserModel(userData);
    const savedUser = await user.save();

    expect(savedUser.identifier).toEqual(userData.identifier);
    expect(savedUser.name).toEqual(userData.name);
    expect(savedUser.gitHandle).toEqual(userData.gitHandle);
  });

  it('should update an existing user', async () => {
    const originalUser = new UserModel({
      identifier: 'user002',
      name: 'Jane Doe',
    });
    await originalUser.save();

    const updatedName = 'Jane Smith';
    const updatedUser = await UserModel.findByIdAndUpdate(
      originalUser._id,
      { name: updatedName },
      { new: true }
    );

    expect(updatedUser?.name).toEqual(updatedName);
  });

  it('should delete a user', async () => {
    const userToDelete = new UserModel({
      identifier: 'user003',
      name: 'Mike Ross',
    });
    await userToDelete.save();

    const deletedUser = await UserModel.findByIdAndDelete(userToDelete._id);
    expect(deletedUser?._id).toStrictEqual(userToDelete._id);
  });

  it('should not save a user without required fields', async () => {
    const user = new UserModel({ identifier: 'user004' });
    await expect(user.save()).rejects.toThrow();
  });

  it('should enroll a user in courses', async () => {
    const user = new UserModel({ identifier: 'user005', name: 'Sarah Connor' });
    await user.save();

    const course1 = new CourseModel({
      name: 'Math 101',
      code: 'MATH101',
      semester: 'Spring 2023',
      courseType: 'Normal' as CourseType,
    });
    const course2 = new CourseModel({
      name: 'Science 102',
      code: 'SCI102',
      semester: 'Spring 2023',
      courseType: 'Normal' as CourseType,
    });
    await Promise.all([course1.save(), course2.save()]);

    user.enrolledCourses.push(course1._id, course2._id);
    const updatedUser = await user.save();

    expect(updatedUser.enrolledCourses).toHaveLength(2);
    expect(updatedUser.enrolledCourses).toEqual(
      expect.arrayContaining([course1._id, course2._id])
    );
  });
});
