import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { ReproResolver } from './repro.resolver';
import { errorStatusPlugin } from './plugins/error-status.plugin';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloFederationDriverConfig>({
      driver: ApolloFederationDriver,
      autoSchemaFile: {
        federation: 2,
      },
      playground: true,
      introspection: true,
      // This is the default behavior that causes the regression
      autoTransformHttpErrors: false,
      plugins: [errorStatusPlugin()],
    }),
  ],
  providers: [ReproResolver],
})
export class AppModule {}
