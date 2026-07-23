import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createUser(userData: Prisma.UserCreateInput) {
    const users = await this.prisma.user.create({ data: userData });

    return users;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        profileImage: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // .select('+password +isActive +role');
  }

  async findById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async findByIdWithPassword(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        profileImage: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // .select('+password +isActive');
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        profileImage: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // .select('-password');
  }

  async blockUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async updatePassword(userId: string, password: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password,
      },
    });
  }

  async unblockUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: true,
      },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.delete({ where: { id } });
  }
}
