import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'sehatsetu_secret_key_12345',
    });
  }

  async validate(payload: { sub: string; role: string; ver?: number }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, select: { role: true, accountStatus: true, tokenVersion: true } });
    if (!user || user.accountStatus !== 'ACTIVE' || user.role !== payload.role || user.tokenVersion !== (payload.ver ?? 0)) {
      throw new UnauthorizedException('Session is no longer valid');
    }
    return { userId: payload.sub, role: payload.role };
  }
}
