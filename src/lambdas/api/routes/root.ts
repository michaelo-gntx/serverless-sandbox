import { Logger } from "@aws-lambda-powertools/logger";
import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import type { AppEnv } from "../types";

const logger = new Logger({ serviceName: "Root" });

export const router = new OpenAPIHono<AppEnv>();

const root = createRoute({
	method: "get",
	path: "/",
	description: "Application Readiness",
	tags: ["Root"],
	responses: {
		200: {
			content: { "text/plain": { schema: z.string() } },
			description: "Application readiness response",
		},
	},
});

router.openapi(root, (c) => {
	return c.text("OK");
});

const HealthSchema = z.object({
	status: z.string(),
});

const health = createRoute({
	method: "get",
	path: "/healthz",
	description: "Health Check",
	tags: ["Root"],
	responses: {
		200: {
			content: { "application/json": { schema: HealthSchema } },
			description: "Application health",
		},
	},
});

router.openapi(health, (c) => {
	logger.info("Health check.");
	return c.json({ status: "ok" });
});
