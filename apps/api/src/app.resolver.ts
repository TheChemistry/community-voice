import { Resolver, Query, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth/auth.guard';
import { prisma } from '@community-voice/database';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
class UserProfile {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field()
  role: string;

  @Field()
  isActive: boolean;
}

@Resolver()
export class AppResolver {
  @Query(() => String)
  hello(): string {
    return 'Hello from Community Voice API!';
  }

  @Query(() => UserProfile, { name: 'me', nullable: true })
  @UseGuards(AuthGuard)
  async me(@Context() context: any) {
    const reqUser = context.req?.user || context.user;
    if (!reqUser || !reqUser.id) return null;

    return prisma.user.findUnique({
      where: { id: reqUser.id },
    });
  }
}
