import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async createUser(
    userData: Partial<User>,
    session?: any,
  ): Promise<UserDocument> {
    const users = await this.userModel.create([userData], { session });

    return users[0];
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      email,
    });
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email })
      .select('+password +isActive +role');
  }

  async findById(userId: string) {
    return this.userModel.findById(userId);
  }

  async findByIdWithPassword(userId: string) {
    return this.userModel.findById(userId).select('+password +isActive');
  }

  async getAllUsers() {
    return this.userModel.find().select('-password');
  }

  async getUserById(id: string) {
    return this.userModel.findById(id).select('-password');
  }

  async blockUser(id: string) {
    return this.userModel.findByIdAndUpdate(
      id,
      {
        isActive: false,
      },
      {
        new: true,
      },
    );
  }

  async updatePassword(userId: string, password: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      {
        password,
      },
      {
        new: true,
      },
    );
  }

  async unblockUser(id: string) {
    return this.userModel.findByIdAndUpdate(
      id,
      {
        isActive: true,
      },
      {
        new: true,
      },
    );
  }

  async deleteUser(id: string) {
    return this.userModel.findByIdAndDelete(id);
  }
}
