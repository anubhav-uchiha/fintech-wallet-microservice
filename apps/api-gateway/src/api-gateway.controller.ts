import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller()
export class ApiGatewayController {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
  ) {}

  @Get('ping')
  async ping() {
    const response = await firstValueFrom(
      this.authClient.send({ cmd: 'ping' }, {}),
    );

    return response;
  }
}
