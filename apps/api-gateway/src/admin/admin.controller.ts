import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AdminService } from './admin.service';

import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==========================
  // COMMISSION MANAGEMENT
  // ==========================

  @Post('commission')
  createCommission(@Body() dto: CreateCommissionDto) {
    return this.adminService.createCommission(dto);
  }

  @Get('commission')
  getAllCommission() {
    return this.adminService.getAllCommission();
  }

  @Get('commission/:id')
  getCommissionById(@Param('id') id: string) {
    return this.adminService.getCommissionById(id);
  }

  @Patch('commission/:id')
  updateCommission(@Param('id') id: string, @Body() dto: UpdateCommissionDto) {
    return this.adminService.updateCommission(id, dto);
  }

  @Delete('commission/:id')
  deleteCommission(@Param('id') id: string) {
    return this.adminService.deleteCommission(id);
  }

  @Get('users')
  getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/block')
  blockUser(@Param('id') id: string) {
    return this.adminService.blockUser(id);
  }

  @Patch('users/:id/unblock')
  unblockUser(@Param('id') id: string) {
    return this.adminService.unblockUser(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }
}
