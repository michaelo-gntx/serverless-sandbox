import { z } from "@hono/zod-openapi";
import { PaginationMetaSchema } from "./common";

export const TagSchema = z
	.object({
		id: z.uuid(),
		userId: z.uuid(),
		name: z.string(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi("Tag");

export const TagWithUsageSchema = TagSchema.extend({
	usageCount: z.number().int().min(0),
}).openapi("TagWithUsage");

export const TagListSchema = z
	.object({
		data: z.array(TagWithUsageSchema),
		pagination: PaginationMetaSchema,
	})
	.openapi("TagList");

export const CreateTagSchema = z.object({
	name: z.string().min(1).openapi({ example: "typescript" }),
});

export const UpdateTagSchema = z.object({
	name: z.string().min(1).openapi({ example: "typescript" }),
});
