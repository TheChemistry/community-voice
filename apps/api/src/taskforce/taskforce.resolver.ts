import { Resolver, Mutation, Query, Args, ObjectType, Field, ID, InputType } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { TaskForceService } from './taskforce.service';

@InputType()
class CreateTaskForceInput {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  category: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  scheduledAt?: Date;
}

@ObjectType()
class Volunteer {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  taskForceId: string;

  @Field()
  joinedAt: Date;
}

@ObjectType()
export class TaskForce {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  category: string;

  @Field({ nullable: true })
  location?: string;

  @Field({ nullable: true })
  scheduledAt?: Date;

  @Field()
  creatorId: string;

  @Field(() => [Volunteer])
  volunteers: Volunteer[];

  @Field(() => Number)
  volunteerCount: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@Resolver(() => TaskForce)
export class TaskForceResolver {
  constructor(private taskForceService: TaskForceService) {}

  @Query(() => [TaskForce], { name: 'taskForces' })
  async taskForces() {
    const taskForces = await this.taskForceService.listTaskForces();
    return taskForces.map(tf => ({
      ...tf,
      volunteerCount: tf.volunteers.length,
    }));
  }

  @Query(() => TaskForce, { name: 'taskForce', nullable: true })
  async taskForce(@Args('id', { type: () => ID }) id: string) {
    const tf = await this.taskForceService.getTaskForce(id);
    if (!tf) return null;
    return {
      ...tf,
      volunteerCount: tf.volunteers.length,
    };
  }

  @UseGuards(AuthGuard)
  @Mutation(() => TaskForce)
  async createTaskForce(
    @Args('input') input: CreateTaskForceInput,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.id;
    const tf = await this.taskForceService.createTaskForce(userId, input);
    return {
      ...tf,
      volunteerCount: tf.volunteers.length,
    };
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Volunteer)
  async joinTaskForce(
    @Args('taskForceId', { type: () => ID }) taskForceId: string,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.id;
    return this.taskForceService.joinTaskForce(userId, taskForceId);
  }
}
