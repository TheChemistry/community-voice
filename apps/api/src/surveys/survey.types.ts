import { ObjectType, Field, ID, InputType } from '@nestjs/graphql';
import { GraphQLScalarType, Kind } from 'graphql';

function parseLiteral(ast: any): any {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT: {
      const value = Object.create(null);
      ast.fields.forEach((field) => {
        value[field.name.value] = parseLiteral(field.value);
      });
      return value;
    }
    case Kind.LIST:
      return ast.values.map(parseLiteral);
    case Kind.NULL:
      return null;
    default:
      return undefined;
  }
}

export const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON',
  description: 'The `JSON` scalar type represents JSON values.',
  serialize(value) {
    return value;
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    return parseLiteral(ast);
  },
});

@ObjectType()
export class SurveyResponse {
  @Field(() => ID)
  id: string;

  @Field()
  surveyId: string;

  @Field({ nullable: true })
  userId?: string;

  @Field(() => GraphQLJSON)
  answers: any;

  @Field()
  submittedAt: Date;
}

@ObjectType()
export class Survey {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => GraphQLJSON)
  schemaJson: any;

  @Field()
  isActive: boolean;

  @Field({ nullable: true })
  expiresAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => [SurveyResponse], { nullable: true })
  responses?: SurveyResponse[];
}

@InputType()
export class CreateSurveyInput {
  @Field()
  title: string;

  @Field()
  description: string;

  @Field(() => GraphQLJSON)
  schemaJson: any;

  @Field({ nullable: true })
  isActive?: boolean;

  @Field({ nullable: true })
  expiresAt?: Date;
}

@InputType()
export class SubmitSurveyResponseInput {
  @Field()
  surveyId: string;

  @Field(() => GraphQLJSON)
  answers: any;
}
