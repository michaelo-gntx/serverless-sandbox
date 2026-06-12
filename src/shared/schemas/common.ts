import { z } from "@hono/zod-openapi";

export const UuidParamSchema = z.object({
	id: z.uuid().openapi({
		param: { name: "id", in: "path" },
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
});

export const PaginationQuerySchema = z.object({
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(20)
		.openapi({
			param: { name: "limit", in: "query" },
			example: 20,
		}),
	offset: z.coerce
		.number()
		.int()
		.min(0)
		.default(0)
		.openapi({
			param: { name: "offset", in: "query" },
			example: 0,
		}),
});

export const PaginationMetaSchema = z
	.object({
		total: z.number(),
		limit: z.number(),
		offset: z.number(),
		hasMore: z.boolean(),
	})
	.openapi("PaginationMeta");

export const ErrorSchema = z
	.object({
		error: z.object({
			code: z.string(),
			message: z.string(),
			details: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
		}),
	})
	.openapi("Error");
