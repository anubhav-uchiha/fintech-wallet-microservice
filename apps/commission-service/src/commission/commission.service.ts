import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionType, Prisma, ServiceType } from '../generated/prisma';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class CommissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateCommissionDto) {
    try {
      const exists = await this.prisma.commission.findUnique({
        where: {
          serviceType: dto.serviceType as ServiceType,
        },
      });

      if (exists) {
        throw new ConflictException(
          `${dto.serviceType} commission already exists`,
        );
      }

      const commission = await this.prisma.commission.create({
        data: {
          serviceType: dto.serviceType as ServiceType,
          commissionType: dto.commissionType as CommissionType,
          value: new Prisma.Decimal(dto.value),
          minimum: new Prisma.Decimal(dto.minimum ?? 0),
          maximum: new Prisma.Decimal(dto.maximum ?? 999999),
        },
      });

      await this.redisService.set(
        `commission:${commission.serviceType}`,
        commission,
      );

      return {
        message: 'Commission created successfully',
        data: commission,
      };
    } catch (error) {
      console.log('CREATE COMMISSION ERROR');
      console.log(error);

      throw error;
    }
  }

  async getAll() {
    return this.prisma.commission.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getById(id: string) {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('Commission rule not found');
    }

    return commission;
  }

  async update(id: string, dto: UpdateCommissionDto) {
    const exists = await this.prisma.commission.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new RpcException({
        statusCode: 404,
        message: 'Commission rule not found',
      });
    }

    const commission = await this.prisma.commission.update({
      where: { id },
      data: {
        serviceType: dto.serviceType
          ? (dto.serviceType as ServiceType)
          : undefined,
        commissionType: dto.commissionType
          ? (dto.commissionType as CommissionType)
          : undefined,
        value:
          dto.value !== undefined ? new Prisma.Decimal(dto.value) : undefined,
        minimum:
          dto.minimum !== undefined
            ? new Prisma.Decimal(dto.minimum)
            : undefined,
        maximum:
          dto.maximum !== undefined
            ? new Prisma.Decimal(dto.maximum)
            : undefined,
      },
    });

    if (!commission) {
      throw new RpcException({
        statusCode: 404,
        message: 'Commission rule not found',
      });
    }

    await this.redisService.set(
      `commission:${commission.serviceType}`,
      commission,
    );

    return {
      message: 'Commission updated successfully',
      data: commission,
    };
  }

  async remove(id: string) {
    const commission = await this.prisma.commission.findUnique({
      where: { id },
    });

    if (!commission) {
      throw new NotFoundException('Commission rule not found');
    }

    await this.redisService.del(`commission:${commission.serviceType}`);

    await this.prisma.commission.delete({ where: { id } });

    return {
      message: 'Commission deleted successfully',
    };
  }

  async calculate(serviceType: string, amount: number) {
    console.log('Inside calculate()');
    console.log(serviceType);
    console.log(amount);
    const cacheKey = `commission:${serviceType}`;

    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      console.log('✅ Commission loaded from Redis');

      const rule = JSON.parse(cached);
      const value = Number(rule.value);

      const commission =
        rule.commissionType === CommissionType.PERCENTAGE
          ? (amount * value) / 100
          : value;

      return {
        commission,
        totalDebit: amount + commission,
      };
    }

    console.log('Checking Redis...');

    console.log('⚡ Commission loaded from MongoDB');

    const rule = await this.prisma.commission.findUnique({
      where: {
        serviceType: serviceType as ServiceType,
        isActive: true,
      },
    });

    if (!rule) {
      throw new NotFoundException(
        `Commission not configured for ${serviceType}`,
      );
    }

    console.log(rule);

    await this.redisService.set(cacheKey, rule);

    const value = Number(rule.value);

    const commission =
      rule.commissionType === CommissionType.PERCENTAGE
        ? (amount * value) / 100
        : value;

    return {
      commission,
      totalDebit: amount + commission,
    };
  }
}
