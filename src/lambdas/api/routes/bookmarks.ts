import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { getDb } from "~src/shared/db/client";
import type { Bookmark, Tag } from "~src/shared/db/types";
import {
	BookmarkListQuerySchema,
	BookmarkListSchema,
	BookmarkWithTagsSchema,
	BulkDeleteSchema,
	BulkTagSchema,
	CreateBookmarkSchema,
	UpdateBookmarkSchema,
} from "~src/shared/schemas/bookmarks";
import { UuidParamSchema } from "~src/shared/schemas/common";
import {
	bulkDeleteBookmarks,
	bulkTagBookmarks,
	createBookmark,
	deleteBookmark,
	getBookmarkById,
	listBookmarks,
	updateBookmark,
} from "~src/shared/services/bookmarks";
import { authentication } from "../middleware";
import type { AppEnv } from "../types";

export const router = new OpenAPIHono<AppEnv>();
router.use(authentication());

// GET /bookmarks
const listBookmarksRoute = createRoute({
	method: "get",
	path: "/bookmarks",
	description: "List Bookmarks",
	tags: ["Bookmarks"],
	request: { query: BookmarkListQuerySchema },
	responses: {
		200: {
			content: { "application/json": { schema: BookmarkListSchema } },
			description: "Bookmarks listed",
		},
	},
});

router.openapi(listBookmarksRoute, async (c) => {
	const { limit, offset, collectionId, tagId, search } = c.req.valid("query");
	const userId = c.get("userId");
	const db = getDb();
	const { data, total } = await listBookmarks(db, userId, { limit, offset, collectionId, tagId, search });
	return c.json(
		{
			data: data.map(serializeBookmark),
			pagination: { total, limit, offset, hasMore: offset + limit < total },
		},
		200,
	);
});

// POST /bookmarks/bulk-delete (must be defined before /:id routes)
const bulkDeleteRoute = createRoute({
	method: "post",
	path: "/bookmarks/delete",
	description: "Bulk Delete Bookmarks",
	tags: ["Bookmarks"],
	request: {
		body: { content: { "application/json": { schema: BulkDeleteSchema } }, required: true },
	},
	responses: {
		200: {
			content: { "application/json": { schema: z.object({ deleted: z.number() }).openapi("BulkDeleteResult") } },
			description: "Bookmarks bulk deleted",
		},
	},
});

router.openapi(bulkDeleteRoute, async (c) => {
	const { ids } = c.req.valid("json");
	const userId = c.get("userId");
	const db = getDb();
	const result = await bulkDeleteBookmarks(db, userId, ids);
	return c.json(result, 200);
});

// POST /bookmarks/bulk-tag
const bulkTagRoute = createRoute({
	method: "post",
	path: "/bookmarks/tag",
	description: "Bulk Tag Bookmarks",
	tags: ["Bookmarks"],
	request: {
		body: { content: { "application/json": { schema: BulkTagSchema } }, required: true },
	},
	responses: {
		200: {
			content: { "application/json": { schema: z.object({ updated: z.number() }).openapi("BulkTagResult") } },
			description: "Bookmarks bulk tagged",
		},
	},
});

router.openapi(bulkTagRoute, async (c) => {
	const data = c.req.valid("json");
	const userId = c.get("userId");
	const db = getDb();
	const result = await bulkTagBookmarks(db, userId, data);
	return c.json(result, 200);
});

// POST /bookmarks
const createBookmarkRoute = createRoute({
	method: "post",
	path: "/bookmarks",
	description: "Create Bookmark",
	tags: ["Bookmarks"],
	request: {
		body: { content: { "application/json": { schema: CreateBookmarkSchema } }, required: true },
	},
	responses: {
		201: {
			content: { "application/json": { schema: BookmarkWithTagsSchema } },
			description: "Bookmark created",
		},
	},
});

router.openapi(createBookmarkRoute, async (c) => {
	const data = c.req.valid("json");
	const userId = c.get("userId");
	const db = getDb();
	const bookmark = await createBookmark(db, userId, data);
	return c.json(serializeBookmark(bookmark), 201);
});

// GET /bookmarks/:id
const getBookmarkRoute = createRoute({
	method: "get",
	path: "/bookmarks/{id}",
	description: "Get Bookmark",
	tags: ["Bookmarks"],
	request: { params: UuidParamSchema },
	responses: {
		200: {
			content: { "application/json": { schema: BookmarkWithTagsSchema } },
			description: "Bookmark retrieved",
		},
	},
});

router.openapi(getBookmarkRoute, async (c) => {
	const { id } = c.req.valid("param");
	const userId = c.get("userId");
	const db = getDb();
	const bookmark = await getBookmarkById(db, userId, id);
	return c.json(serializeBookmark(bookmark), 200);
});

// PATCH /bookmarks/:id
const updateBookmarkRoute = createRoute({
	method: "patch",
	path: "/bookmarks/{id}",
	description: "Update Bookmark",
	tags: ["Bookmarks"],
	request: {
		params: UuidParamSchema,
		body: { content: { "application/json": { schema: UpdateBookmarkSchema } }, required: true },
	},
	responses: {
		200: {
			content: { "application/json": { schema: BookmarkWithTagsSchema } },
			description: "Bookmark updated",
		},
	},
});

router.openapi(updateBookmarkRoute, async (c) => {
	const { id } = c.req.valid("param");
	const data = c.req.valid("json");
	const userId = c.get("userId");
	const db = getDb();
	const bookmark = await updateBookmark(db, userId, id, data);
	return c.json(serializeBookmark(bookmark), 200);
});

// DELETE /bookmarks/:id
const deleteBookmarkRoute = createRoute({
	method: "delete",
	path: "/bookmarks/{id}",
	description: "Delete Bookmark",
	tags: ["Bookmarks"],
	request: { params: UuidParamSchema },
	responses: {
		204: { description: "Bookmark deleted" },
	},
});

router.openapi(deleteBookmarkRoute, async (c) => {
	const { id } = c.req.valid("param");
	const userId = c.get("userId");
	const db = getDb();
	await deleteBookmark(db, userId, id);
	return c.body(null, 204);
});

function serializeTag(t: Tag) {
	return {
		...t,
		createdAt: t.createdAt.toISOString(),
		updatedAt: t.updatedAt.toISOString(),
	};
}

function serializeBookmark(b: Bookmark & { tags: Tag[] }) {
	return {
		...b,
		createdAt: b.createdAt.toISOString(),
		updatedAt: b.updatedAt.toISOString(),
		tags: b.tags.map(serializeTag),
	} as unknown as z.infer<typeof BookmarkWithTagsSchema>;
}
