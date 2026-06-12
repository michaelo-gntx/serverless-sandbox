import { z } from "@hono/zod-openapi";

export const CreateUserSchema = z.object({
	name: z.string().min(1).openapi({ example: "Jane Doe" }),
	email: z.email().openapi({ example: "jane@example.com" }),
});

export const UserSchema = z
	.object({
		id: z.uuid(),
		name: z.string(),
		email: z.email(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.openapi("User");
