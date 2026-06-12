import { createRoute, OpenAPIHono, type z } from "@hono/zod-openapi";
import { getDb } from "~src/shared/db/client";
import {
	CollectionListSchema,
	CollectionSchema,
	CollectionWithCountSchema,
	CreateCollectionSchema,
	UpdateCollectionSchema,
} from "~src/shared/schemas/collections";
import { PaginationQuerySchema, UuidParamSchema } from "~src/shared/schemas/common";
import {
	createCollection,
	deleteCollection,
	getCollectionById,
	listCollections,
	updateCollection,
} from "~src/shared/services/collections";
import { authentication } from "../middleware";
import type { AppEnv } from "../types";

export const router = new OpenAPIHono<AppEnv>();
router.use(authentication());

// GET /collections
const listCollectionsRoute = createRoute({
	method: "get",
	path: "/collections",
	description: "List Collections",
	tags: ["Collections"],
	request: { query: PaginationQuerySchema },
	responses: {
		200: {
			content: { "application/json": { schema: CollectionListSchema } },
			description: "Collections listed",
		},
	},
});

router.openapi(listCollectionsRoute, async (c) => {
	const { limit, offset } = c.req.valid("query");
	const userId = c.get("userId");
	const db = getDb();
	const { data, total } = await listCollections(db, userId, { limit, offset });
	return c.json(
		{
			data: data.map(serializeCollection) as z.infer<typeof CollectionSchema>[],
			pagination: { total, limit, offset, hasMore: offset + limit < total },
		},
		200,
	);
});

// POST /collections
const createCollectionRoute = createRoute({
	method: "post",
	path: "/collections",
	description: "Create Collection",
	tags: ["Collections"],
	request: {
		body: { content: { "application/json": { schema: CreateCollectionSchema } }, required: true },
	},
	responses: {
		201: {
			content: { "application/json": { schema: CollectionSchema } },
			description: "Collection created",
		},
	},
});

router.openapi(createCollectionRoute, async (c) => {
	const data = c.req.valid("json");
	const userId = c.get("userId");
	const db = getDb();
	const collection = await createCollection(db, userId, data);
	return c.json(serializeCollection(collection) as z.infer<typeof CollectionSchema>, 201);
});

// GET /collections/:id
const getCollectionRoute = createRoute({
	method: "get",
	path: "/collections/{id}",
	description: "Get Collection",
	tags: ["Collections"],
	request: { params: UuidParamSchema },
	responses: {
		200: {
			content: { "application/json": { schema: CollectionWithCountSchema } },
			description: "Collection retrieved",
		},
	},
});

router.openapi(getCollectionRoute, async (c) => {
	const { id } = c.req.valid("param");
	const userId = c.get("userId");
	const db = getDb();
	const collection = await getCollectionById(db, userId, id);
	return c.json(serializeCollection(collection) as z.infer<typeof CollectionWithCountSchema>, 200);
});

// PATCH /collections/:id
const updateCollectionRoute = createRoute({
	method: "patch",
	path: "/collections/{id}",
	description: "Update Collection",
	tags: ["Collections"],
	request: {
		params: UuidParamSchema,
		body: { content: { "application/json": { schema: UpdateCollectionSchema } }, required: true },
	},
	responses: {
		200: {
			content: { "application/json": { schema: CollectionSchema } },
			description: "Collection updated",
		},
	},
});

router.openapi(updateCollectionRoute, async (c) => {
	const { id } = c.req.valid("param");
	const data = c.req.valid("json");
	const userId = c.get("userId");
	const db = getDb();
	const collection = await updateCollection(db, userId, id, data);
	return c.json(serializeCollection(collection) as z.infer<typeof CollectionSchema>, 200);
});

// DELETE /collections/:id
const deleteCollectionRoute = createRoute({
	method: "delete",
	path: "/collections/{id}",
	description: "Delete Collection",
	tags: ["Collections"],
	request: { params: UuidParamSchema },
	responses: {
		204: { description: "Collection deleted" },
	},
});

router.openapi(deleteCollectionRoute, async (c) => {
	const { id } = c.req.valid("param");
	const userId = c.get("userId");
	const db = getDb();
	await deleteCollection(db, userId, id);
	return c.body(null, 204);
});

function serializeCollection(c: Record<string, unknown>) {
	return {
		...c,
		createdAt: (c.createdAt as Date).toISOString(),
		updatedAt: (c.updatedAt as Date).toISOString(),
	};
}
