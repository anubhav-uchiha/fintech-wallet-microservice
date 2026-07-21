import { Injectable } from '@nestjs/common';

@Injectable()
export class CommissionServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
