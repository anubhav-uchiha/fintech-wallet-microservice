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
    return await this.userModel.findOne({ email });
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return await this.userModel
      .findOne({ email })
      .select('+password +isActive');
  }

  async findById(userId: string): Promise<UserDocument | null> {
    return await this.userModel.findById(userId);
  }

  async updateProfile(
    userId: string,
    updateData: Partial<User>,
  ): Promise<UserDocument | null> {
    return await this.userModel.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  async updatePassword(email: string, password: string) {
    return await this.userModel.findOneAndUpdate(
      { email },
      {
        password,
        otp: undefined,
        otpExpire: undefined,
      },
      {
        new: true,
      },
    );
  }

  async findByIdWithPassword(userId: string): Promise<UserDocument | null> {
    return await this.userModel.findById(userId).select('+password +isActive');
  }

  async updateProfileImage(userId: string, image: string) {
    return await this.userModel.findByIdAndUpdate(
      userId,
      {
        profileImage: image,
      },
      {
        new: true,
      },
    );
  }
}
