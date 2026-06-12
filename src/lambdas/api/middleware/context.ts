import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

/**
 * Middleware that extracts X-User-Id from request headers and stores it in context.
 * Returns 401 if the header is missing.
 */
export const authentication = () =>
	createMiddleware<AppEnv>(async (c, next) => {
		const userId = c.req.header("x-user-id");
		if (!userId) {
			return c.json(
				{
					error: {
						code: "UNAUTHORIZED",
						message: "X-User-Id header is required",
					},
				},
				401,
			);
		}
		c.set("userId", userId);
		await next();
		return;
	});
