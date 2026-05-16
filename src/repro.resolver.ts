import { ForbiddenException, Injectable } from '@nestjs/common';
import { Query, Resolver } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Resolver()
@Injectable()
export class ReproResolver {
  /**
   * Throws a NestJS ForbiddenException (HTTP 403)
   * Expected: HTTP 403 with code: FORBIDDEN and extensions.originalError
    * Observed: HTTP 200 with code: FORBIDDEN
   */
  @Query(() => String)
  throwsForbiddenException(): string {
    throw new ForbiddenException('Forbidden resource');
  }

  /**
   * Throws a NestJS BadRequestException (HTTP 400)
   * Expected: HTTP 400 with code: BAD_REQUEST
   * Observed: HTTP 200 with code: BAD_REQUEST (status is wrong, but code is correct)
   */
  @Query(() => String)
  throwsBadRequestException(): string {
    throw new Error('This will be transformed by formatError');
  }

  /**
   * Throws a GraphQLError with explicit HTTP status
   * Expected: HTTP 403 with code preserved
   * Observed: HTTP 200 with code in response
   */
  @Query(() => String)
  throwsGraphqlErrorWithHttpStatus(): string {
    throw new GraphQLError('Forbidden via GraphQL', {
      extensions: {
        code: 'FORBIDDEN',
        http: { status: 403 },
      },
    });
  }

  /**
   * Success case for comparison
   */
  @Query(() => String)
  hello(): string {
    return 'Hello World!';
  }
}
