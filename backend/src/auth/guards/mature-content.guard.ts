/**
 * Mature Content Access Guard
 * Restricts access to adult content based on age verification
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MATURE_KEY } from '../../common/decorators/mature.decorator';
import { User } from '@prisma/client';

@Injectable()
export class MatureContentGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiresMature = this.reflector.getAllAndOverride<boolean>(MATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresMature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check age verification
    if (!user.isAgeVerified) {
      throw new ForbiddenException(
        'Age verification required. Please complete age verification to access mature content.'
      );
    }

    // Check mature access enabled
    if (!user.matureAccessEnabled) {
      throw new ForbiddenException(
        'Mature content access not enabled. Please enable in your account settings.'
      );
    }

    // Check secondary password if required
    const maturePassword = request.headers['x-mature-password'];
    if (!maturePassword) {
      throw new ForbiddenException(
        'Mature content password required in X-Mature-Password header'
      );
    }

    // Note: Password verification would be done here
    // For security, the mature password hash should be checked

    return true;
  }
}
