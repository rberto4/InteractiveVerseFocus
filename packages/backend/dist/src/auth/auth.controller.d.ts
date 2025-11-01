import { Response } from 'express';
import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    googleAuth(): Promise<void>;
    googleAuthRedirect(req: any, res: Response): Promise<void>;
    exchangeCode(body: {
        code: string;
    }): Promise<{
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
}
//# sourceMappingURL=auth.controller.d.ts.map