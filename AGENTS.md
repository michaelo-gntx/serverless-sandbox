# AGENTS.md

## Project overview

AWS CDK (TypeScript) project deploying a serverless stack: Aurora DSQL database with Drizzle migrations, Hono API on Lambda, all wired via CDK constructs.

## Commands

| Task              | Command                      |
| ----------------- | ---------------------------- |
| Build (typecheck) | `bun run build` (runs `tsc`) |
| Test              | `bun run test` (Jest)        |
| Synth CDK         | `bunx cdk synth`             |
| Deploy            | `bunx cdk deploy`            |
| Diff              | `bunx cdk diff`              |

CDK app entry: `bunx ts-node --prefer-ts-exts bin/infra.ts` (configured in `cdk.json`).

## Architecture

```
bin/infra.ts                        CDK app entrypoint (instantiates stacks)
lib/
  stacks/
    database-stack.ts               Stateful stack (DSQL cluster + migration trigger)
    api-stack.ts                    Stateless stack (API Lambda)
  constructs/                       Base constructs (L2 wrappers)
    lambda/
      index.ts                      Barrel export
      nodejs.ts                     NodejsLambda wrapper (typed env, ARM64, Node 24, esbuild bundled)
  patterns/                         L3 constructs (micro-architecture compositions)
    database/
      index.ts                      Barrel export
      database.ts                   Aurora DSQL cluster + migration Lambda pattern
    api/
      index.ts                      Barrel export
      api.ts                        Hono OpenAPIHono Lambda pattern
  utils/
    strings.ts                      Shared helpers (camelToKebab)
src/
  lambdas/
    api/                            Runtime: Hono routes, Powertools logger/tracer
      index.ts                      Lambda entrypoint
      middleware.ts                 Hono tracing middleware
    migrations/                     Runtime: reads Drizzle journal, applies SQL migrations
      index.ts                      Lambda entrypoint
  shared/                           Shared runtime code (models, schemas, services)
```

- Path alias `~lib/*` maps to `./lib/*` (CDK infrastructure code).
- Path alias `~src/*` maps to `./src/*` (Lambda runtime code).
- `lib/constructs/` contains base constructs — thin wrappers around L2 constructs (e.g., NodejsLambda wrapping NodejsFunction).
- `lib/patterns/` contains L3 constructs — compositions of multiple resources forming micro-architectures (e.g., Database = DSQL cluster + migration Lambda + trigger).
- Lambda handlers live in `src/lambdas/` separate from CDK construct code.
- Migrations use Drizzle's `meta/journal.json` + SQL files, split on `--> statement-breakpoint`.

## Toolchain details

- **Package manager**: Bun. Always use `bun run` / `bunx` (never `npm` / `npx`).
- **Formatter**: Biome. Tabs, 120 line width, trailing commas, semicolons always.
- **TypeScript**: ES2022 target, `NodeNext` module/moduleResolution, strict mode, `bun-types` included.
- **Tests**: Jest with `ts-jest`, test root is `test/`, pattern `**/*.test.ts`. Uses `aws-cdk-lib/testhelpers/jest-autoclean` setup.
- **CDK bundling**: `NodejsFunction` with esbuild (`minify: true`). Lambda runtime: Node.js 24, ARM64.

## Conventions

- Lambda environment variables are typed via generics on `NodejsLambda<T>` / `NodejsLambdaProps<T>`. Always define a `type XEnv` and pass it as a type parameter.
- CDK constructs use `Construct` from `constructs`, not `cdk.Construct`.
- Removal policies are `DESTROY` (sandbox project).
- Log groups are explicitly created per Lambda with 1-month retention.
- Powertools Logger/Tracer initialized at module level in handlers.
- Stacks are thin composition layers; domain logic lives in patterns.
- Cross-stack references use props-based wiring (not SSM or CfnOutputs).

## Gotchas

- No CI workflows exist yet.
- The test file is a stub (all assertions commented out). Tests will pass but verify nothing.
- No `migrations/` directory in the repo yet; the migration Lambda expects it bundled at deploy time.
- `cdk.json` uses `ts-node` to run the CDK app directly from TypeScript (no pre-compile step needed for synth/deploy).
- `tsc` emits `.js`/`.d.ts` alongside source files (no `outDir` configured). Clean with `find . \( -name "*.js" -o -name "*.d.ts" \) -not -path "./node_modules/*" -not -path "./cdk.out/*" -not -name "jest.config.js" -delete`.
