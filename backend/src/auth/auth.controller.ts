import { Body, Controller, Get, Post, Request, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

function resolveSameSite() {
  const sameSite = process.env.AUTH_COOKIE_SAME_SITE?.toLowerCase();
  if (sameSite === 'strict' || sameSite === 'none' || sameSite === 'lax') {
    return sameSite;
  }
  return 'lax';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const loginResult = await this.authService.login(body.username, body.password);

    // frontend sets the cookie; backend returns token in response only.
    return loginResult;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    const sameSite = resolveSameSite();
    const secure = process.env.AUTH_COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production' || sameSite === 'none';
    response.clearCookie(process.env.AUTH_COOKIE_NAME ?? 'imcs_auth', { path: '/', sameSite, secure });
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() request: { user: { userId: number; username: string; role: 'admin' | 'user' } }) {
    return request.user;
  }
}
