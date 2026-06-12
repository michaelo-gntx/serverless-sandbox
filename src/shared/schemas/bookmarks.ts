import { z } from "@hono/zod-openapi";
import { PaginationMetaSchema } from "./common";
import { TagSchema } from "./tags";

export const BookmarkSchema = z
	.object({
		id: z.uuid(),
		userId: z.uuid(),
		collectionId: z.uuid().nullable(),
		url: z.url(),
		title: z.string(),
		description: z.string().nullable(),
		notes: z.string().nullable(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi("Bookmark");

export const BookmarkWithTagsSchema = BookmarkSchema.extend({
	tags: z.array(TagSchema),
}).openapi("BookmarkWithTags");

export const BookmarkListSchema = z
	.object({
		data: z.array(BookmarkWithTagsSchema),
		pagination: PaginationMetaSchema,
	})
	.openapi("BookmarkList");

export const CreateBookmarkSchema = z.object({
	collectionId: z.uuid().optional().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
	url: z.url().openapi({ example: "https://example.com" }),
	title: z.string().min(1).openapi({ example: "Example Article" }),
	description: z.string().optional().openapi({ example: "A short description" }),
	notes: z.string().optional().openapi({ example: "Personal notes" }),
	tagIds: z.array(z.uuid()).optional().openapi({ example: [] }),
});

export const UpdateBookmarkSchema = z.object({
	collectionId: z.uuid().nullable().optional().openapi({ example: "550e8400-e29b-41d4-a716-446655440000" }),
	url: z.url().optional().openapi({ example: "https://example.com" }),
	title: z.string().min(1).optional().openapi({ example: "Example Article" }),
	description: z.string().nullable().optional().openapi({ example: "A short description" }),
	notes: z.string().nullable().optional().openapi({ example: "Personal notes" }),
});

export const BookmarkListQuerySchema = z.object({
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
	collectionId: z
		.uuid()
		.optional()
		.openapi({
			param: { name: "collectionId", in: "query" },
			example: "550e8400-e29b-41d4-a716-446655440000",
		}),
	tagId: z
		.uuid()
		.optional()
		.openapi({
			param: { name: "tagId", in: "query" },
			example: "550e8400-e29b-41d4-a716-446655440000",
		}),
	search: z
		.string()
		.optional()
		.openapi({
			param: { name: "search", in: "query" },
			example: "typescript",
		}),
});

export const BulkDeleteSchema = z.object({
	ids: z
		.array(z.uuid())
		.min(1)
		.openapi({ example: ["550e8400-e29b-41d4-a716-446655440000"] }),
});

export const BulkTagSchema = z.object({
	bookmarkIds: z.array(z.uuid()).min(1),
	tagIds: z.array(z.uuid()).min(1),
	action: z.enum(["add", "remove"]),
});
