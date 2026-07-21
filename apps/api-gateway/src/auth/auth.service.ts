import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from 'apps/auth-service/src/auth/dto/change-password.dto';

@Injectable()
export class AuthGatewayService {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,
  ) {}

  async register(dto: RegisterDto) {
    return firstValueFrom(this.authClient.send({ cmd: 'register' }, dto));
  }

  async login(dto: LoginDto) {
    return firstValueFrom(this.authClient.send({ cmd: 'login' }, dto));
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    return firstValueFrom(
      this.authClient.send(
        { cmd: 'change_password' },
        {
          userId,
          dto,
        },
      ),
    );
  }

  async refreshToken(refreshToken: string) {
    return firstValueFrom(
      this.authClient.send({ cmd: 'refresh_token' }, refreshToken),
    );
  }

  async logout() {
    return firstValueFrom(this.authClient.send({ cmd: 'logout' }, {}));
  }
}
