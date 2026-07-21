import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { CommissionService } from './commission.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { CalculateCommissionDto } from './dto/calculate-commission.dto';

@Controller()
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  // Create Commission
  @MessagePattern({ cmd: 'create_commission' })
  create(@Payload() dto: any) {
    console.log('CONTROLLER HIT');
    console.log(dto);

    return this.commissionService.create(dto);
  }

  // Get All Commission Rules
  @MessagePattern({ cmd: 'get_all_commission' })
  getAll() {
    return this.commissionService.getAll();
  }

  // Get One Commission Rule
  @MessagePattern({ cmd: 'get_commission_by_id' })
  getById(@Payload() id: string) {
    return this.commissionService.getById(id);
  }

  // Update Commission Rule
  @MessagePattern({ cmd: 'update_commission' })
  update(
    @Payload()
    data: {
      id: string;
      dto: UpdateCommissionDto;
    },
  ) {
    return this.commissionService.update(data.id, data.dto);
  }

  // Delete Commission Rule
  @MessagePattern({ cmd: 'delete_commission' })
  remove(@Payload() id: string) {
    return this.commissionService.remove(id);
  }

  // Calculate Commission
  @MessagePattern({ cmd: 'calculate_commission' })
  async calculate(@Payload() dto: CalculateCommissionDto) {
    try {
      console.log('Commission Calculate Called');
      console.log(dto);

      const result = await this.commissionService.calculate(
        dto.serviceType,
        dto.amount,
      );

      console.log(result);

      return result;
    } catch (err) {
      console.log('COMMISSION ERROR');
      console.log(err);
      throw err;
    }
  }
}
