import { Controller, Get, Post, Body, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    try {
      const result = await this.authService.handleGoogleCallback(req.user);
      
      // Redirect back to extension with token
      const redirectUrl = `${process.env.EXTENSION_REDIRECT_URL || 'http://localhost:3000/auth-success'}?token=${result.token}&userId=${result.user.id}`;
      res.redirect(redirectUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.redirect(`${process.env.EXTENSION_REDIRECT_URL || 'http://localhost:3000/auth-error'}?error=${errorMessage}`);
    }
  }

  @Post('exchange')
  async exchangeCode(@Body() body: { code: string }) {
    try {
      const result = await this.authService.exchangeCodeForToken(body.code);
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Get('verify')
  async verifyToken(@Query('token') token: string) {
    return this.authService.verifyToken(token);
  }
}
