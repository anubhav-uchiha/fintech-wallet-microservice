import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UsersService } from '../users/users.service';
import {
  comparePassword,
  hashPassword,
} from 'apps/fintech-wallet-microservices/src/common/utils/password.util';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RabbitMQService } from '../common/rabbitmq/rabbitmq.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,

    @Inject('WALLET_SERVICE')
    private readonly walletClient: ClientProxy,

    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('Email alredy exists');
    }

    const hashedPassword = await hashPassword(registerDto.password);

    const user = await this.usersService.createUser({
      name: registerDto.name,
      email: registerDto.email,
      password: hashedPassword,
      role: registerDto.role ?? 'USER',
    });
    try {
      const wallet = await firstValueFrom(
        this.walletClient.send(
          { cmd: 'create_wallet' },
          {
            userId: user.id,
          },
        ),
      );

      const { password, ...userResponse } = user;

      return {
        message: 'User registered successfully',
        data: {
          user: userResponse,
          wallet,
        },
      };
    } catch (error) {
      console.error(error);
      throw new RpcException({
        status: error,
        message: 'User created, but wallet creation failed',
        error,
      });
    }
  }

  async login(loginDto: LoginDto) {
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await comparePassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: '1d',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: '7d',
    });

    return {
      message: 'Login successful',
      accessToken,
      refreshToken,
    };
  }

  async findUserByEmail(email: string) {
    return this.usersService.findByEmail(email);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is blocked by admin');
    }

    const isMatch = await comparePassword(dto.currentPassword, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const samePassword = await comparePassword(dto.newPassword, user.password);

    if (samePassword) {
      throw new BadRequestException(
        'New password cannot be same as current password',
      );
    }

    const hashedPassword = await hashPassword(dto.newPassword);

    await this.usersService.updatePassword(userId, hashedPassword);

    return {
      message: 'Password changed successfully',
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);

      const accessToken = await this.jwtService.signAsync(
        {
          sub: payload.sub,
          email: payload.email,
        },
        {
          expiresIn: '15m',
        },
      );

      return {
        accessToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout() {
    return {
      message: 'Logged out successfully',
    };
  }

  // ===========================
  // ADMIN APIs
  // ===========================

  async getUsers() {
    return this.usersService.getAllUsers();
  }

  async getUser(id: string) {
    const user = await this.usersService.getUserById(id);

    if (!user) {
      throw new RpcException('User not found');
    }

    return user;
  }

  async blockUser(id: string) {
    const user = await this.usersService.blockUser(id);

    if (!user) {
      throw new RpcException('User not found');
    }

    await this.rabbitMQService.publish('USER_BLOCKED', {
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      message: 'User blocked successfully',
      user,
    };
  }

  async unblockUser(id: string) {
    const user = await this.usersService.unblockUser(id);

    if (!user) {
      throw new RpcException('User not found');
    }

    return {
      message: 'User unblocked successfully',
      user,
    };
  }

  async deleteUser(id: string) {
    const user = await this.usersService.deleteUser(id);

    if (!user) {
      throw new RpcException('User not found');
    }

    await this.rabbitMQService.publish('USER_DELETED', {
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return {
      message: 'User deleted successfully',
    };
  }
}
