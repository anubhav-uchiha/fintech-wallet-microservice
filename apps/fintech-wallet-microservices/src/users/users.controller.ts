import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Req() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Post('upload-profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/profile',

        filename(req, file, cb) {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);

          cb(null, uniqueName + extname(file.originalname));
        },
      }),
    }),
  )
  uploadProfile(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.updateProfileImage(
      req.user.userId,
      `/uploads/profile/${file.filename}`,
    );
  }
}
