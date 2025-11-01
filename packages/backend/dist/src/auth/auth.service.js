"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async exchangeCodeForToken(code) {
        const clientId = this.configService.get('GOOGLE_CLIENT_ID');
        const clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET');
        const extensionId = this.configService.get('EXTENSION_ID');
        const redirectUri = `https://${extensionId}.chromiumapp.org/`;
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
            throw new common_1.UnauthorizedException('Failed to exchange code for token');
        }
        const tokens = await tokenResponse.json();
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });
        if (!userInfoResponse.ok) {
            throw new common_1.UnauthorizedException('Failed to fetch user info');
        }
        const googleUser = await userInfoResponse.json();
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
    async handleGoogleCallback(googleUser) {
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
                expiresAt: new Date(Date.now() + 3600 * 1000),
            },
            create: {
                userId: user.id,
                provider: 'google',
                accessToken: googleUser.accessToken,
                refreshToken: googleUser.refreshToken,
                expiresAt: new Date(Date.now() + 3600 * 1000),
            },
        });
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
    async verifyToken(token) {
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
                throw new common_1.UnauthorizedException('User not found');
            }
            return { valid: true, user };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
    async getUserTokens(userId) {
        return this.prisma.authToken.findFirst({
            where: {
                userId,
                provider: 'google',
            },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map