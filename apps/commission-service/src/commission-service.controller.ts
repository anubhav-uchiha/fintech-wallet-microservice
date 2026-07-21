import { Controller, Get } from '@nestjs/common';
import { CommissionServiceService } from './commission-service.service';

@Controller()
export class CommissionServiceController {
  constructor(private readonly commissionServiceService: CommissionServiceService) {}

  @Get()
  getHello(): string {
    return this.commissionServiceService.getHello();
  }
}
