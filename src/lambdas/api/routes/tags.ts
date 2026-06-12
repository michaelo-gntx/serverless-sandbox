import { createRoute, OpenAPIHono, type z } from "@hono/zod-openapi";
import { UuidParamSchema } from "~src/shared/schemas/common";
import { CreateTagSchema, TagListSchema, TagWithUsageSchema, UpdateTagSchema } from "~src/shared/schemas/tags";
import { createTag, deleteTag, listTags, updateTag } from "~src/shared/services/tags";
import { authentication } from "../middleware";
import type { AppEnv } from "../types";

export const router = new OpenAPIHono<AppEnv>();
router.use(authentication());

function serializeTag(t: Record<string, unknown>) {
	return {
		...t,
		createdAt: (t.createdAt as Date).toISOString(),
		updatedAt: (t.updatedAt as Date).toISOString(),
	};
}

// GET /tags
const listTagsRoute = createRoute({
	method: "get",
	path: "/tags",
	description: "List Tags",
	tags: ["Tags"],
	responses: {
		200: {
			content: { "application/json": { schema: TagListSchema } },
			description: "Tags listed",
		},
	},
});

router.openapi(listTagsRoute, async (c) => {
	const userId = c.get("userId");
	const { data, total } = await listTags(c.var.db, userId, { limit: 100, offset: 0 });
	return c.json(
		{
			data: data.map(serializeTag) as z.infer<typeof TagWithUsageSchema>[],
			pagination: { total, limit: 100, offset: 0, hasMore: false },
		},
		200,
	);
});

// POST /tags
const createTagRoute = createRoute({
	method: "post",
	path: "/tags",
	description: "Create Tag",
	tags: ["Tags"],
	request: {
		body: { content: { "application/json": { schema: CreateTagSchema } }, required: true },
	},
	responses: {
		201: {
			content: { "application/json": { schema: TagWithUsageSchema } },
			description: "Tag created",
		},
	},
});

router.openapi(createTagRoute, async (c) => {
	const data = c.req.valid("json");
	const userId = c.get("userId");
	const tag = await createTag(c.var.db, userId, data);
	return c.json({ ...serializeTag(tag), usageCount: 0 } as z.infer<typeof TagWithUsageSchema>, 201);
});

// PATCH /tags/:id
const updateTagRoute = createRoute({
	method: "patch",
	path: "/tags/{id}",
	description: "Update Tag",
	tags: ["Tags"],
	request: {
		params: UuidParamSchema,
		body: { content: { "application/json": { schema: UpdateTagSchema } }, required: true },
	},
	responses: {
		200: {
			content: { "application/json": { schema: TagWithUsageSchema } },
			description: "Tag updated",
		},
	},
});

router.openapi(updateTagRoute, async (c) => {
	const { id } = c.req.valid("param");
	const data = c.req.valid("json");
	const userId = c.get("userId");
	const tag = await updateTag(c.var.db, userId, id, data);
	// Re-fetch usage count after update
	const { data: tags } = await listTags(c.var.db, userId, { limit: 1, offset: 0 });
	const usageCount = tags.find((t) => t.id === id)?.usageCount ?? 0;
	return c.json({ ...serializeTag(tag), usageCount } as z.infer<typeof TagWithUsageSchema>, 200);
});

// DELETE /tags/:id
const deleteTagRoute = createRoute({
	method: "delete",
	path: "/tags/{id}",
	description: "Delete Tag",
	tags: ["Tags"],
	request: { params: UuidParamSchema },
	responses: {
		204: { description: "Tag deleted" },
	},
});

router.openapi(deleteTagRoute, async (c) => {
	const { id } = c.req.valid("param");
	const userId = c.get("userId");
	await deleteTag(c.var.db, userId, id);
	return c.body(null, 204);
});
