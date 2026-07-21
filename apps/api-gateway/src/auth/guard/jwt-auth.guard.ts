import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {
    console.log(this.jwtService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header missing');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    try {
      console.log('==============================');
      console.log('Authorization:', authHeader);
      console.log('Token:', token);
      console.log('JWT_SECRET:', process.env.JWT_SECRET);

      const payload = await this.jwtService.verifyAsync(token);

      console.log('Payload:', payload);

      request.user = {
        userId: payload.sub,
        email: payload.email,
      };

      return true;
    } catch (err) {
      console.log('JWT ERROR =>', err);
      throw new UnauthorizedException('Invalid or expired token');
    }

    // try {
    //   const payload = await this.jwtService.verifyAsync(token);

    //   request.user = {
    //     userId: payload.sub,
    //     email: payload.email,
    //   };

    //   return true;
    // } catch {
    //   throw new UnauthorizedException('Invalid or expired token');
    // }
  }
}
