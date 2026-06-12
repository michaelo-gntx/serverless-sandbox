import { Logger } from "@aws-lambda-powertools/logger";
import { Tracer } from "@aws-lambda-powertools/tracer";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { handle } from "hono/aws-lambda";
import { logger as requestLogger } from "hono/logger";
import { AppError } from "~src/shared/errors";
import { db, traceMethod } from "./middleware";
import { router as bookmarks } from "./routes/bookmarks";
import { router as collections } from "./routes/collections";
import { router as root } from "./routes/root";
import { router as tags } from "./routes/tags";
import { router as users } from "./routes/users";
import type { AppEnv } from "./types";

// Initialize observability tooling.
const serviceName = "API";
const logger = new Logger({ serviceName });
const tracer = new Tracer({ serviceName });

const app = new OpenAPIHono<AppEnv>({
	defaultHook: (result, c) => {
		if (!result.success) {
			return c.json(
				{
					error: {
						code: "VALIDATION_ERROR",
						message: "Invalid request",
						details: result.error.issues.map((issue) => ({
							field: issue.path.join("."),
							message: issue.message,
						})),
					},
				},
				400,
			);
		}
		return;
	},
});

// Global middleware
app.use(db);
app.use(traceMethod(tracer));
app.use(
	requestLogger((msg: string, ...extra: string[]) => {
		logger.info(msg, { extra });
	}),
);

// System routes
app.route("/", root);

// Domain routes
app.route("/api/v1", users);
app.route("/api/v1", collections);
app.route("/api/v1", bookmarks);
app.route("/api/v1", tags);

// OpenAPI spec
app.doc31("/openapi.json", {
	openapi: "3.1.0",
	info: {
		title: "Bookmarks API",
		version: "1.0.0",
	},
});
app.get("/docs", swaggerUI({ url: "/openapi.json" }));

// Error handling
app.onError((err, c) => {
	if (err instanceof AppError) {
		return c.json({ error: { code: err.code, message: err.message } }, err.status as 400 | 401 | 404 | 409 | 500);
	}
	logger.error("Unhandled error", { error: err });
	return c.json(
		{
			error: {
				code: "INTERNAL_ERROR",
				message: "Internal server error",
			},
		},
		500,
	);
});

app.notFound((c) => {
	return c.json(
		{
			error: {
				code: "NOT_FOUND",
				message: "Route not found",
			},
		},
		404,
	);
});

export const handler = handle(app);
