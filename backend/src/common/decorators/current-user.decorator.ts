import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | Partial<User> | null => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      return null;
    }

    if (data) {
      // Type assertion needed because User[keyof User] can return various types
      // that don't directly match User | Partial<User> return type
      return user[data] as any;
    }

    return user;
  },
);
