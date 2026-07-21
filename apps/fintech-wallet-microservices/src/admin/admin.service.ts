import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Admin, AdminDocument } from './admin.schema';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { AdminLoginDto } from './dto/admin-login.dto';
import * as bcrypt from 'bcrypt';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { comparePassword, hashPassword } from 'src/common/utils/password.util';
import { User, UserDocument } from 'src/users/user.schema';
import { Wallet, WalletDocument } from 'src/wallet/wallet.schema';
import {
  Transaction,
  TransactionDocument,
} from 'src/transaction/transaction.schema';
import { GetUsersDto } from './dto/get-users.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Admin.name)
    private readonly adminModel: Model<AdminDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,

    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,

    private readonly jwtService: JwtService,
  ) {}

  async register(dto: AdminRegisterDto) {
    const existingAdmin = await this.adminModel.findOne({
      email: dto.email,
    });

    if (existingAdmin) {
      throw new ConflictException('Admin already exists');
    }

    const hashedPassword = await hashPassword(dto.password);

    const admin = await this.adminModel.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    const { password, ...response } = admin.toObject();

    return {
      message: 'Admin registered successfully',
      data: response,
    };
  }

  async createAdmin(data: Partial<Admin>) {
    return await this.adminModel.create(data);
  }

  async findByEmail(email: string) {
    return await this.adminModel.findOne({ email }).select('+password');
  }

  async login(dto: AdminLoginDto) {
    const admin = await this.findByEmail(dto.email);

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await comparePassword(dto.password, admin.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account disabled');
    }

    const payload = {
      adminId: admin._id.toString(),
      email: admin.email,
      role: 'ADMIN',
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Admin login successful',
      accessToken,
    };
  }

  async dashboard() {
    const totalUsers = await this.userModel.countDocuments();

    const totalWallets = await this.walletModel.countDocuments();

    const activeWallets = await this.walletModel.countDocuments({
      status: 'ACTIVE',
    });

    const frozenWallets = await this.walletModel.countDocuments({
      status: 'FROZEN',
    });

    const closedWallets = await this.walletModel.countDocuments({
      status: 'CLOSED',
    });

    const totalTransactions = await this.transactionModel.countDocuments();

    const balance = await this.walletModel.aggregate([
      {
        $group: {
          _id: null,
          total: {
            $sum: '$balance',
          },
        },
      },
    ]);

    return {
      totalUsers,
      totalWallets,
      activeWallets,
      frozenWallets,
      closedWallets,
      totalTransactions,
      totalMoneyInWallets: balance[0]?.total ?? 0,
    };
  }

  async getAllUsers(query: GetUsersDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.search) {
      filter.$or = [
        {
          name: {
            $regex: query.search,
            $options: 'i',
          },
        },
        {
          email: {
            $regex: query.search,
            $options: 'i',
          },
        },
      ];
    }

    const users = await this.userModel
      .find(filter)
      .select('-password')
      .skip(skip)
      .limit(limit)
      .sort({
        createdAt: -1,
      });

    const totalUsers = await this.userModel.countDocuments(filter);

    return {
      users,

      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.userModel.findById(userId).select('-password');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const wallet = await this.walletModel.findOne({
      userId,
    });

    const transactions = await this.transactionModel
      .find({
        userId,
      })
      .sort({
        createdAt: -1,
      })
      .limit(10);

    return {
      user,
      wallet,
      transactions,
    };
  }

  async freezeUser(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;

    await user.save();

    return {
      message: 'User frozen successfully',
    };
  }

  async unfreezeUser(userId: string) {
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = true;

    await user.save();

    return {
      message: 'User activated successfully',
    };
  }
}
