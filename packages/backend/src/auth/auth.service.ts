import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async exchangeCodeForToken(code: string) {
    const clientId = this.configService.get('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
    const extensionId = this.configService.get('EXTENSION_ID');
    const redirectUri = `https://${extensionId}.chromiumapp.org/`;

    // Exchange code for tokens with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      throw new UnauthorizedException('Failed to exchange code for token');
    }

    const tokens: any = await tokenResponse.json();

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new UnauthorizedException('Failed to fetch user info');
    }

    const googleUser: any = await userInfoResponse.json();

    // Create/update user and store tokens
    const result = await this.handleGoogleCallback({
      googleId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });

    return result;
  }

  async handleGoogleCallback(googleUser: any) {
    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { googleId: googleUser.googleId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId: googleUser.googleId,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture,
        },
      });
    }

    // Store or update tokens
    await this.prisma.authToken.upsert({
      where: { 
        userId_provider: {
          userId: user.id,
          provider: 'google',
        },
      },
      update: {
        accessToken: googleUser.accessToken,
        refreshToken: googleUser.refreshToken || undefined,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      },
      create: {
        userId: user.id,
        provider: 'google',
        accessToken: googleUser.accessToken,
        refreshToken: googleUser.refreshToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
    });

    // Generate JWT for extension
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    };
  }

  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          picture: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return { valid: true, user };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUserTokens(userId: string) {
    return this.prisma.authToken.findFirst({
      where: { 
        userId,
        provider: 'google',
      },
    });
  }
}
