import { z } from "@hono/zod-openapi";
import { PaginationMetaSchema } from "./common";

export const CollectionSchema = z
	.object({
		id: z.uuid(),
		userId: z.uuid(),
		name: z.string(),
		description: z.string().nullable(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi("Collection");

export const CollectionWithCountSchema = CollectionSchema.extend({
	bookmarkCount: z.number().int().min(0),
}).openapi("CollectionWithCount");

export const CollectionListSchema = z
	.object({
		data: z.array(CollectionSchema),
		pagination: PaginationMetaSchema,
	})
	.openapi("CollectionList");

export const CreateCollectionSchema = z.object({
	name: z.string().min(1).openapi({ example: "Reading List" }),
	description: z.string().optional().openapi({ example: "Articles to read later" }),
});

export const UpdateCollectionSchema = z.object({
	name: z.string().min(1).optional().openapi({ example: "Reading List" }),
	description: z.string().nullable().optional().openapi({ example: "Articles to read later" }),
});
