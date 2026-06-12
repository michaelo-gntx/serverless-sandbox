import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { getDb } from "~src/shared/db/client";
import { CreateUserSchema, UserSchema } from "~src/shared/schemas/users";
import { createUser, getUserById } from "~src/shared/services/users";
import { authentication } from "../middleware";
import type { AppEnv } from "../types";

export const router = new OpenAPIHono<AppEnv>();

// POST /users
const createUserRoute = createRoute({
	method: "post",
	path: "/users",
	description: "Create User",
	tags: ["Users"],
	request: {
		body: {
			content: { "application/json": { schema: CreateUserSchema } },
			required: true,
		},
	},
	responses: {
		201: {
			content: { "application/json": { schema: UserSchema } },
			description: "User created",
		},
	},
});

router.openapi(createUserRoute, async (c) => {
	const data = c.req.valid("json");
	const db = getDb();
	const user = await createUser(db, data);
	return c.json(
		{
			...user,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		},
		201,
	);
});

// GET /users
const getUserRoute = createRoute({
	method: "get",
	path: "/users",
	description: "Get User",
	tags: ["Users"],
	middleware: [authentication()],
	responses: {
		200: {
			content: { "application/json": { schema: UserSchema } },
			description: "User retrieved",
		},
	},
});

router.openapi(getUserRoute, async (c) => {
	const id = c.var.userId;
	const db = getDb();

	const segment = c.var.trace.addNewSubsegment(`## query db`);
	const user = await getUserById(db, id);
	segment.close();

	return c.json(
		{
			...user,
			createdAt: user.createdAt.toISOString(),
			updatedAt: user.updatedAt.toISOString(),
		},
		200,
	);
});
