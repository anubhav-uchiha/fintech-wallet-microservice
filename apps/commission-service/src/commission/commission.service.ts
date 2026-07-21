import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Commission } from './commission.schema';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class CommissionService {
  constructor(
    @InjectModel(Commission.name)
    private readonly commissionModel: Model<Commission>,

    private readonly redisService: RedisService,
  ) {}

  // ==========================
  // CREATE COMMISSION
  // ==========================

  async create(dto: CreateCommissionDto) {
    try {
      const exists = await this.commissionModel.findOne({
        serviceType: dto.serviceType,
      });

      if (exists) {
        throw new ConflictException(
          `${dto.serviceType} commission already exists`,
        );
      }

      const commission = await this.commissionModel.create(dto);

      // Store in Redis
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

  // ==========================
  // GET ALL
  // ==========================

  async getAll() {
    return this.commissionModel.find();
  }

  // ==========================
  // GET BY ID
  // ==========================

  async getById(id: string) {
    const commission = await this.commissionModel.findById(id);

    if (!commission) {
      throw new NotFoundException('Commission rule not found');
    }

    return commission;
  }

  // ==========================
  // UPDATE
  // ==========================

  async update(id: string, dto: UpdateCommissionDto) {
    const commission = await this.commissionModel.findByIdAndUpdate(id, dto, {
      new: true,
    });

    if (!commission) {
      throw new NotFoundException('Commission rule not found');
    }

    // Update Redis
    await this.redisService.set(
      `commission:${commission.serviceType}`,
      commission,
    );

    return {
      message: 'Commission updated successfully',
      data: commission,
    };
  }

  // ==========================
  // DELETE
  // ==========================

  async remove(id: string) {
    const commission = await this.commissionModel.findById(id);

    if (!commission) {
      throw new NotFoundException('Commission rule not found');
    }

    // Remove from Redis
    await this.redisService.del(`commission:${commission.serviceType}`);

    await commission.deleteOne();

    return {
      message: 'Commission deleted successfully',
    };
  }

  // ==========================
  // CALCULATE COMMISSION
  // ==========================

  async calculate(serviceType: string, amount: number) {
    console.log('Inside calculate()');
    console.log(serviceType);
    console.log(amount);
    const cacheKey = `commission:${serviceType}`;

    // Check Redis first
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      console.log('✅ Commission loaded from Redis');

      const rule = JSON.parse(cached);

      const commission =
        rule.commissionType === 'PERCENTAGE'
          ? (amount * rule.value) / 100
          : rule.value;

      return {
        commission,
        totalDebit: amount + commission,
      };
    }

    console.log('Checking Redis...');

    // Load from MongoDB
    console.log('⚡ Commission loaded from MongoDB');

    const rule = await this.commissionModel.findOne({
      serviceType,
      isActive: true,
    });

    if (!rule) {
      throw new NotFoundException(
        `Commission not configured for ${serviceType}`,
      );
    }

    console.log(rule);

    // Save to Redis
    await this.redisService.set(cacheKey, rule);

    const commission =
      rule.commissionType === 'PERCENTAGE'
        ? (amount * rule.value) / 100
        : rule.value;

    return {
      commission,
      totalDebit: amount + commission,
    };
  }
}
