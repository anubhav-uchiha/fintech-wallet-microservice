import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller()
export class NotificationController {
  @EventPattern('USER_BLOCKED')
  handleUserBlocked(@Payload() data: any) {
    console.log('==============================');
    console.log('USER BLOCKED');
    console.log(data);
  }

  @EventPattern('USER_DELETED')
  handleUserDeleted(@Payload() data: any) {
    console.log('==============================');
    console.log('USER DELETED');
    console.log(data);
  }

  @EventPattern('transaction.created')
  handleTransaction(@Payload() data: any) {
    console.log('==============================');
    console.log('TRANSACTION CREATED');
    console.log(data);
  }

  @EventPattern('transaction.rollback')
  handleRollback(@Payload() data: any) {
    console.log('==============================');
    console.log('TRANSACTION ROLLBACK');
    console.log(data);
  }
}
