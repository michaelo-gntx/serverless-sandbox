import { and, count, eq, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import { bookmarkTags, tags } from "../db/schema";
import { conflict, notFound } from "../errors";

export async function listTags(db: Database, userId: string, opts: { limit: number; offset: number }) {
	const where = and(eq(tags.userId, userId), isNull(tags.deletedAt));

	const [data, totalResult] = await Promise.all([
		db.select().from(tags).where(where).limit(opts.limit).offset(opts.offset),
		db.select({ value: count() }).from(tags).where(where),
	]);

	// Fetch usage counts for all returned tags
	const usageCounts = await db
		.select({ tagId: bookmarkTags.tagId, value: count() })
		.from(bookmarkTags)
		.groupBy(bookmarkTags.tagId);

	const usageMap = new Map(usageCounts.map((r) => [r.tagId, r.value]));

	return {
		data: data.map((t) => ({ ...t, usageCount: usageMap.get(t.id) ?? 0 })),
		total: totalResult[0]?.value ?? 0,
	};
}

export async function createTag(db: Database, userId: string, data: { name: string }) {
	// Enforce uniqueness per user at the application layer
	const [existing] = await db
		.select()
		.from(tags)
		.where(and(eq(tags.userId, userId), eq(tags.name, data.name), isNull(tags.deletedAt)))
		.limit(1);

	if (existing) throw conflict(`Tag "${data.name}" already exists`);

	const [tag] = await db
		.insert(tags)
		.values({ ...data, userId })
		.returning();
	return tag;
}

export async function updateTag(db: Database, userId: string, id: string, data: { name: string }) {
	// Enforce uniqueness per user at the application layer
	const [existing] = await db
		.select()
		.from(tags)
		.where(and(eq(tags.userId, userId), eq(tags.name, data.name), isNull(tags.deletedAt)))
		.limit(1);

	if (existing && existing.id !== id) throw conflict(`Tag "${data.name}" already exists`);

	const [tag] = await db
		.update(tags)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(tags.id, id), eq(tags.userId, userId), isNull(tags.deletedAt)))
		.returning();

	if (!tag) throw notFound("Tag");
	return tag;
}

export async function deleteTag(db: Database, userId: string, id: string) {
	const [tag] = await db
		.delete(tags)
		.where(and(eq(tags.id, id), eq(tags.userId, userId)))
		.returning();

	if (!tag) throw notFound("Tag");

	// Hard-delete associated bookmark_tags (app-layer cascade)
	await db.delete(bookmarkTags).where(eq(bookmarkTags.tagId, id));

	return tag;
}
