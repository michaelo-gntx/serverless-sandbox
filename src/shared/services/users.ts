import { and, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { users } from "../db/schema";
import { notFound } from "../errors";

export async function createUser(db: Database, data: { name: string; email: string }) {
	const [user] = await db.insert(users).values(data).returning();
	return user;
}

export async function getUserById(db: Database, id: string) {
	const results = await db
		.select()
		.from(users)
		.where(and(eq(users.id, id), isNull(users.deletedAt)))
		.limit(1);

	if (!results[0]) throw notFound("User");
	return results[0];
}
