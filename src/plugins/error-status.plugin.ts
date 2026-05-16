import { ApolloServerPlugin } from '@apollo/server';
import { HttpStatus } from '@nestjs/common';

const hasGraphqlErrors = (response: any): boolean =>
  response?.body?.kind === 'single' &&
  Array.isArray(response.body.singleResult?.errors) &&
  response.body.singleResult.errors.length > 0;

export function errorStatusPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart() {
      return {
        async willSendResponse({ response }): Promise<void> {
          if (!hasGraphqlErrors(response)) {
            return;
          }

          if (response.http) {
            response.http.status = HttpStatus.BAD_REQUEST;
          }
        },
      };
    },
  };
}
