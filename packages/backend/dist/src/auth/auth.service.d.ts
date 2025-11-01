import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    exchangeCodeForToken(code: string): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            picture: string | null;
        };
    }>;
    handleGoogleCallback(googleUser: any): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            name: string | null;
            picture: string | null;
        };
    }>;
    verifyToken(token: string): Promise<{
        valid: boolean;
        user: {
            id: string;
            name: string | null;
            email: string;
            picture: string | null;
        };
    }>;
    getUserTokens(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        provider: string;
        accessToken: string;
        refreshToken: string | null;
        expiresAt: Date;
    } | null>;
}
//# sourceMappingURL=auth.service.d.ts.map