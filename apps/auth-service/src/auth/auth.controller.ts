import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern({ cmd: 'register' })
  register(@Payload() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @MessagePattern({ cmd: 'login' })
  login(@Payload() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @MessagePattern({ cmd: 'find_user_by_email' })
  findUserByEmail(@Payload() email: string) {
    return this.authService.findUserByEmail(email);
  }

  @MessagePattern({ cmd: 'change_password' })
  changePassword(@Payload() data: { userId: string; dto: ChangePasswordDto }) {
    return this.authService.changePassword(data.userId, data.dto);
  }

  @MessagePattern({ cmd: 'refresh_token' })
  refresh(@Payload() refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @MessagePattern({ cmd: 'logout' })
  logout() {
    return this.authService.logout();
  }

  @MessagePattern({ cmd: 'get_all_users' })
  getAllUsers() {
    return this.authService.getUsers();
  }

  @MessagePattern({ cmd: 'get_user' })
  getUser(@Payload() id: string) {
    return this.authService.getUser(id);
  }

  @MessagePattern({ cmd: 'block_user' })
  blockUser(@Payload() id: string) {
    return this.authService.blockUser(id);
  }

  @MessagePattern({ cmd: 'unblock_user' })
  unblockUser(@Payload() id: string) {
    return this.authService.unblockUser(id);
  }

  @MessagePattern({ cmd: 'delete_user' })
  deleteUser(@Payload() id: string) {
    return this.authService.deleteUser(id);
  }
}
