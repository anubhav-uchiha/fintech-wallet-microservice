import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AuthServiceController {
  @MessagePattern({ cmd: 'ping' })
  ping() {
    return {
      message: 'Pong from Auth Service 🚀',
    };
  }
}
