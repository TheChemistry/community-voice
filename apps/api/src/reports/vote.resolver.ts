import { Resolver, Mutation, Args, ID, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { VoteService } from './vote.service';
import { CivicReport } from './reports.resolver';

@Resolver()
export class VoteResolver {
  constructor(private voteService: VoteService) {}

  @UseGuards(AuthGuard)
  @Mutation(() => CivicReport)
  async vote(
    @Args('reportId', { type: () => ID }) reportId: string,
    @Args('direction', { type: () => Int }) direction: number,
    @CurrentUser() user: any,
  ) {
    const userId = user.sub || user.id;
    return this.voteService.vote(userId, reportId, direction);
  }
}
