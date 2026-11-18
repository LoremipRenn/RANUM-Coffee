import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

interface JwtPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'CASHIER' | 'BARISTA' | 'WAITER';
  branchId: string;
}

function extractJwtFromHeaderOrQuery(req: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;
  const queryToken = req.query?.['token'];
  return typeof queryToken === 'string' && queryToken.length > 0 ? queryToken : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: extractJwtFromHeaderOrQuery,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'ranum-coffee-dev-jwt-secret',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, branchId: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Akun staf tidak ditemukan atau telah dinonaktifkan.');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      branchId: user.branchId,
    };
  }
}
