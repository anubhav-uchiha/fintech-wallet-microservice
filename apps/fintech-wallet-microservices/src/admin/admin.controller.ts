import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminService } from './admin.service';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { GetUsersDto } from './dto/get-users.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  @Post('register')
  register(@Body() dto: AdminRegisterDto) {
    return this.adminService.register(dto);
  }
  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  @Get('dashboard')
  dashboard() {
    return this.adminService.dashboard();
  }

  @Get('users')
  getUsers(@Query() query: GetUsersDto) {
    return this.adminService.getAllUsers(query);
  }

  @Get('users/:userId')
  getUser(@Param('userId') userId: string) {
    return this.adminService.getUserById(userId);
  }

  @Patch('users/:userId/freeze')
  freezeUser(@Param('userId') userId: string) {
    return this.adminService.freezeUser(userId);
  }

  @Patch('users/:userId/unfreeze')
  unfreezeUser(@Param('userId') userId: string) {
    return this.adminService.unfreezeUser(userId);
  }
}
