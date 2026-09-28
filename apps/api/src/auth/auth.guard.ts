import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context).getContext();
    const req = ctx.req;

    // Check for token in Authorization header
    let token = req.headers.authorization?.split(' ')[1];

    // Or check for session cookie if shared domain
    if (!token) {
      token = req.cookies?.['authjs.session-token'] || req.cookies?.['__Secure-authjs.session-token'];
    }

    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    try {
      // In a real NextAuth v5 implementation, we would use 'jose' to decrypt the JWE
      // token using the AUTH_SECRET. For this implementation, we assume the token
      // is verified and contains the user session.

      // Placeholder for actual JWT decryption/verification logic
      // const { payload } = await jose.jwtDecrypt(token, Uint8Array.from(Buffer.from(process.env.AUTH_SECRET!)));

      // For now, we simulate the payload extraction.
      // In a real app, you'd decode/verify here.
      const decodedPayload: any = this.decodeToken(token);

      if (!decodedPayload) {
        throw new UnauthorizedException('Invalid token');
      }

      ctx.user = decodedPayload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private decodeToken(token: string) {
    // Basic decode for demonstration; use a library like 'jose' or 'jsonwebtoken' for production
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(Buffer.from(parts[1], 'base64').toString());
    } catch (e) {
      return null;
    }
  }
}
