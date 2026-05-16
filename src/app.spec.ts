import { INestApplication } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ApolloFederationDriver, ApolloFederationDriverConfig } from '@nestjs/apollo';
import { GraphQLModule } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ReproResolver } from './repro.resolver';
import { errorStatusPlugin } from './plugins/error-status.plugin';

describe('NestJS Apollo 13.4.0+ Regression: HTTP Status Preservation', () => {
  async function createApp(autoTransformHttpErrors: boolean): Promise<INestApplication> {
    @Module({
      imports: [
        GraphQLModule.forRoot<ApolloFederationDriverConfig>({
          driver: ApolloFederationDriver,
          autoSchemaFile: {
            federation: 2,
          },
          playground: true,
          introspection: true,
          autoTransformHttpErrors,
          plugins: [errorStatusPlugin()],
        }),
      ],
      providers: [ReproResolver],
    })
    class TestAppModule {}

    const moduleRef = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();
    return app;
  }

  describe('when autoTransformHttpErrors is true', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(true);
    });

    afterAll(async () => {
      await app.close();
    });

    it('REGRESSION: should return HTTP 400 for ForbiddenException, but returns 200', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: '{ throwsForbiddenException }',
        });

      // Product expectation: HTTP 400 with code: FORBIDDEN and extensions.originalError
      // Current behavior: HTTP 200
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data', null);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');
      expect(response.body.errors?.[0]?.extensions?.originalError).toMatchObject({
        error: 'Forbidden',
        message: 'Forbidden resource',
        statusCode: 403,
      });
    });

    it('should keep success path behavior unchanged', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: '{ hello }',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.hello).toBe('Hello World!');
    });
  });

  describe('when autoTransformHttpErrors is false', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(false);
    });

    afterAll(async () => {
      await app.close();
    });

    it('REGRESSION: should return FORBIDDEN, but returns INTERNAL_SERVER_ERROR', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: '{ throwsForbiddenException }',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('data', null);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors?.[0]?.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('REGRESSION: should return originalError, but returns undefined', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: '{ throwsForbiddenException }',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('data', null);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors?.[0]?.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
      expect(response.body.errors?.[0]?.extensions?.originalError).toBeUndefined();
    });

    it('should keep success path behavior unchanged', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: '{ hello }',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data.hello).toBe('Hello World!');
    });
  });
});
