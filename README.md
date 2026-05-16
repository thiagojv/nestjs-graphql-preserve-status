# nestjs-graphql-preserve-status

NestJS GraphQL RFC proposing granular control over HTTP status preservation for execution errors. Resolves @nestjs/apollo 13.4.0+ regression affecting APIs requiring explicit 4xx status codes alongside error transformation.

## Problem Summary

After upgrading to `@nestjs/apollo` v13.4.0 (which includes PR #3940), execution-level GraphQL errors are forced to return HTTP 200, even when:

1. Upstream code throws ForbiddenException (HTTP 403)
2. GraphQL errors carry explicit `extensions.http.status` values

Error mapping and `extensions.originalError` are still present, but the transport-level status is normalized to 200.

This breaks APIs that depend on explicit HTTP status signaling.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Run the application

```bash
npm run dev
```

GraphQL Playground will be available at `http://localhost:3000/graphql`

### 3. Run tests (shows regression)

```bash
npm run test
```

## Reproduction Steps

### Via cURL

Start the application: `npm run dev`

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ throwsForbiddenException }"
  }'
```

### Expected Response

```http
HTTP/1.1 403 Forbidden

{
  "data": null,
  "errors": [
    {
      "message": "Forbidden resource",
      "extensions": {
        "code": "FORBIDDEN",
        "originalError": {
          "error": "Forbidden",
          "message": "Forbidden resource",
          "statusCode": 403
        }
      }
    }
  ]
}
```

### Observed Response when toggle is on (BUG)

```http
HTTP/1.1 200 OK

{
  "data": null,
  "errors": [
    {
      "message": "Forbidden resource",
      "extensions": {
        "code": "FORBIDDEN",
        "originalError": {
          "error": "Forbidden",
          "message": "Forbidden resource",
          "statusCode": 403
        }
      }
    }
  ]
}
```

### Observed Response when toggle is off (BUG)

```http
HTTP/1.1 400 OK

{
  "data": null,
  "errors": [
    {
      "message": "Forbidden resource",
      "extensions": {
        "code": "INTERNAL_SERVER_ERROR"
      }
    }
  ]
}
```

## Test Output

Run `npm run test` to see detailed regression documentation:

```md
NestJS Apollo 13.4.0+ Regression: HTTP Status Preservation
  when autoTransformHttpErrors is true
    ✓ REGRESSION: should return HTTP 400 for ForbiddenException, but returns 200 (36 ms)
    ✓ should keep success path behavior unchanged (3 ms)
  when autoTransformHttpErrors is false
    ✓ REGRESSION: should return FORBIDDEN, but returns INTERNAL_SERVER_ERROR (4 ms)
    ✓ REGRESSION: should return originalError, but returns undefined (2 ms)
    ✓ should keep success path behavior unchanged (3 ms)
```

## Impact

This regression affects:

- **APIs** relying on HTTP status codes for observability
- **Load balancers & proxies** depending on 4xx/5xx for routing
- **Monitoring systems** parsing HTTP status for alerting
- **API clients/gateways** relying on transport-level status for policy/telemetry decisions

## Configuration

The bug is triggered by the default NestJS Apollo configuration:

```typescript
GraphQLModule.forRoot<ApolloFederationDriverConfig>({
  driver: ApolloFederationDriver,
  autoSchemaFile: { federation: 2 },
  autoTransformHttpErrors: true,  // ← Enables the preserve-status plugin
})
```

The preserve-status plugin is injected when `autoTransformHttpErrors: true`, which also enables error transformation. There's no way to get error transformation without forced HTTP 200.

## Proposed Solution

Decouple HTTP status preservation from error transformation with a new configuration option:

```typescript
GraphQLModule.forRoot<ApolloFederationDriverConfig>({
  driver: ApolloFederationDriver,
  autoSchemaFile: { federation: 2 },
  autoTransformHttpErrors: true,                    // Error transformation
  preserveHttpStatusForExecutionErrors: false,      // NEW: Don't force HTTP 200
})
```

See the RFC issue in the NestJS GraphQL repository for full implementation details and unit tests.

## Project Structure

```md
src/
├── main.ts                    # Application entry point
├── app.module.ts              # GraphQL configuration (triggers regression)
├── repro.resolver.ts          # Queries demonstrating the bug
└── app.spec.ts                # Comprehensive regression tests

Configuration:
├── package.json               # Dependencies (minimal set)
├── tsconfig.json              # TypeScript configuration
└── jest.config.js             # Jest test runner
```

## Environment

- Node.js: 20.x+
- @apollo/server: 5.5.1
- @nestjs/apollo: 13.4.0 (regression version)
- @nestjs/graphql: 13.4.0

## Affected Versions

- @nestjs/apollo >= 13.3.0
- @nestjs/graphql >= 13.3.0

## Related

- Issue: Apollo driver regression in @nestjs/apollo 13.4.0
- Related PR: #3940 "fix(apollo): preserve HTTP 200 for execution-level GraphQL errors"
- Regression introduced: 2024
