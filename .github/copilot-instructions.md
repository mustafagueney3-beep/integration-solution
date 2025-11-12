## Repo snapshot for AI coding agents

This project is a small NestJS-based integration demo that wires an OMS (orders), Payments proxy, WMS and Inventory pieces together. The goal of this file is to give an AI agent immediate, actionable context so changes are safe and consistent.

### Big picture
- Framework: NestJS (TypeScript). Entrypoint: `src/main.ts`, root module: `src/app.module.ts`.
- Modules: `src/oms` (order APIs), `src/payment` (payment proxy/controller), `src/wms` (warehouse), `src/inventory` (inventory client/server). `AppModule` imports: `InventoryModule, WmsModule, OmsModule`.
- API surface: all HTTP routes are prefixed with `/api` (see `app.setGlobalPrefix('api', ...)` in `src/main.ts`). OpenAPI combined file lives in `specs/` (the app loads `specs/oms-openapi.yaml`).

### Key architectural & runtime notes (must-follow)
- The server proxies payments requests to an external payments service at `/api/payments`. The proxy target is controlled by env var `PAYMENT_SERVICE_URL` (default `http://payments:3001/api`). See proxy middleware in `src/main.ts`.
- Validation: global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`. DTOs are strict: extra fields are rejected. See DTOs in `src/oms/dto` and `src/payment/dto`.
- Error handling: `ProblemDetailsFilter` (RFC7807-like) is used globally. See `src/common/problem-details.filter.ts` for error shape expectations.
- Correlation ID: requests get `X-Correlation-Id` header via `CorrelationIdMiddleware` in `src/main.ts`. Preserve/propagate this header when calling other services.
- OpenAPI & Docs: the app serves interactive docs at `/docs` and raw specs at `/openapi`. Prefer updating `specs/oms-openapi.yaml` for API contract changes.

### Integration points and messaging
- Protobuf: `proto/inventory.proto` and `src/inventory` suggest gRPC-style inventory integration (see `inventory.client.ts`, and `inventory/server.js`). When editing inventory integration, check `proto/` for message shapes.
- Message brokers / cache / infra libs: the project depends on `amqplib`/`amqp-connection-manager` (RabbitMQ), `nats`, `ioredis` and `cache-manager-redis-store`. Look for usage in `src/wms/wms.messaging.ts`, `src/wms/wms.service.ts` and other modules.
- DB: TypeORM is installed (`typeorm`, `pg`)—if adding DB entities, follow patterns used in `src/payment/payment.entity.ts`.

### Dev / build / test workflows (concrete commands)
- Install: `npm install`
- Run development: `npm run start:dev` (uses Nest CLI watch)
- Build: `npm run build` (or `npm run build:prod` which cleans `dist` first)
- Run production build: `npm run start` (runs `node dist/main.js`)
- Tests: unit tests via `npm run test` (Jest). There is a `test/` directory with e2e scaffolding (`test/app.e2e-spec.ts`, `jest-e2e.json`) but package scripts only include the basic `test` and `test:watch` scripts—use `npm run test` for local validation.
- Lint/format: `npm run lint`, `npm run format`.
- Docker: multiple Dockerfiles exist (`inventory/Dockerfile`, `wms/Dockerfile`) and there is a `docker-compose.yml` for local integration. Use `docker-compose up --build` to bring up composed services when needed.

### Project-specific conventions & patterns
- Module order matters for initial wiring: AppModule imports Inventory, WMS, then OMS. Follow local import locations and avoid reordering unless necessary.
- DTO and validation policy: create DTOs under the module `dto/` folder (examples: `src/oms/dto/order-create.dto.ts`, `src/payment/dto/payment-create.dto.ts`). Use `class-validator` decorators and rely on the global ValidationPipe behavior.
- Error shape: raise HTTP exceptions that map well to `ProblemDetailsFilter` (see `src/common/problem-details.filter.ts`) so clients receive consistent RFC7807-style problems.
- Correlation id: always forward `X-Correlation-Id` in outgoing HTTP/gRPC messages and include it in logs.

### Small examples the agent can use
- Add a new OMS route: create DTO in `src/oms/dto`, update `src/oms/orders.controller.ts` and business logic in `src/oms/orders.service.ts`.
- Add an OpenAPI change: edit `specs/oms-openapi.yaml` and ensure `src/main.ts` continues to filter out `/payments` paths before serving docs.
- Fix payments proxy for local testing: override `PAYMENT_SERVICE_URL` env var or change `express` proxy in `src/main.ts` for temporary reroute.

### Files to inspect first (quick reference)
- `src/main.ts` — global middleware, docs, proxy, validation rules
- `src/app.module.ts` — high-level module wiring
- `specs/oms-openapi.yaml` — canonical OpenAPI contract for the combined app
- `proto/inventory.proto`, `src/inventory/inventory.client.ts` — inventory integration
- `src/common/problem-details.filter.ts`, `src/common/idempotency.interceptor.ts` — error + idempotency patterns
- `test/` — e2e scaffolding

### Safety rules for automated edits
- Preserve `X-Correlation-Id` propagation. Don't remove or silently change it.
- Validation is strict. If adding endpoints, update and run DTO-based tests; do not accept unknown payload keys.
- When editing APIs, update `specs/oms-openapi.yaml` and ensure the docs at `/docs` remain consistent.

If anything above is unclear or you'd like more detail on a specific module (inventory, wms, or payments), tell me which area and I will expand the instructions or add concrete code examples. 👇

---
Please review these notes — tell me if you want more examples (controller/DTO snippets, typical test patterns, or how the docker-compose is expected to be used for local integration). 
