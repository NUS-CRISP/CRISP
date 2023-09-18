import mongoose, { ConnectOptions } from "mongoose";
import UserModel, { User } from '../../models/User';

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost/testdb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  } as ConnectOptions);
});

beforeEach(async () => {
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('UserModel', () => {
  it('should create and save a new user', async () => {
    const userData: User = {
      id: '123',
      name: 'John Doe',
      email: 'johndoe@example.com',
      enrolledCourses: [],
      gitHandle: 'johndoe-git',
      role: 'student',
    };

    const user = new UserModel(userData);

    const savedUser = await user.save();

    expect(savedUser.id).toEqual(userData.id);
    expect(savedUser.name).toEqual(userData.name);
    expect(savedUser.email).toEqual(userData.email);
    expect(savedUser.enrolledCourses).toEqual(userData.enrolledCourses);
    expect(savedUser.gitHandle).toEqual(userData.gitHandle);
    expect(savedUser.role).toEqual(userData.role);
  });

  it('should not save a user without required fields', async () => {
    const userData = {
      name: 'John Doe',
      enrolledCourses: [],
      gitHandle: 'johndoe-git',
      role: 'student',
    };
  
    const user = new UserModel(userData);
  
    await expect(user.save()).rejects.toThrow();
  });

  it('should update an existing user', async () => {
    const existingUser = new UserModel({
      id: '123',
      name: 'Alice',
      email: 'alice@example.com',
      enrolledCourses: [],
      gitHandle: 'alice-git',
      role: 'student',
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
      id: '456',
      name: 'Bob',
      email: 'bob@example.com',
      enrolledCourses: [],
      gitHandle: 'bob-git',
      role: 'student',
    });

    await userToDelete.save();

    const deletedUser = await UserModel.findByIdAndDelete(userToDelete._id);

    expect(deletedUser?._id).toStrictEqual(userToDelete._id);
  });

  it('should not save a user with a duplicate id', async () => {
    const user1 = new UserModel({
      id: '123',
      name: 'John Doe',
      email: 'johndoe@example.com',
      enrolledCourses: [],
      gitHandle: 'johndoe-git',
      role: 'student',
    });
  
    await user1.save();
  
    const user2 = new UserModel({
      id: '123',
      name: 'Duplicate John',
      email: 'duplicate@example.com',
      enrolledCourses: [],
      gitHandle: 'duplicate-git',
      role: 'student',
    });
  
    await expect(user2.save()).rejects.toThrow();
  });  
  
  it('should not save a user with a duplicate email', async () => {
    const user1 = new UserModel({
      id: '123',
      name: 'John Doe',
      email: 'johndoe@example.com',
      enrolledCourses: [],
      gitHandle: 'johndoe-git',
      role: 'student',
    });
  
    await user1.save();
  
    const user2 = new UserModel({
      id: '456',
      name: 'Another User',
      email: 'johndoe@example.com',
      enrolledCourses: [],
      gitHandle: 'another-user-git',
      role: 'student',
    });
  
    await expect(user2.save()).rejects.toThrow();
  });
  
  it('should not save a user with an invalid role', async () => {
    const user = new UserModel({
      id: '123',
      name: 'Invalid Role User',
      email: 'invalid@example.com',
      enrolledCourses: [],
      gitHandle: 'invalid-role-git',
      role: 'invalid-role',
    });
  
    await expect(user.save()).rejects.toThrow();
  });

});
