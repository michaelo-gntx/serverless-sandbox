import { and, count, eq, isNull } from "drizzle-orm";
import type { DsqlDatabase } from "../db/client";
import { bookmarks, collections } from "../db/schema";
import { notFound } from "../errors";

export async function listCollections(db: DsqlDatabase, userId: string, opts: { limit: number; offset: number }) {
	const where = and(eq(collections.userId, userId), isNull(collections.deletedAt));

	const [data, totalResult] = await Promise.all([
		db.select().from(collections).where(where).limit(opts.limit).offset(opts.offset),
		db.select({ value: count() }).from(collections).where(where),
	]);

	const total = totalResult[0]?.value ?? 0;
	return { data, total };
}

export async function getCollectionById(db: DsqlDatabase, userId: string, id: string) {
	const [collection] = await db
		.select()
		.from(collections)
		.where(and(eq(collections.id, id), eq(collections.userId, userId), isNull(collections.deletedAt)))
		.limit(1);

	if (!collection) throw notFound("Collection");

	const [countResult] = await db
		.select({ value: count() })
		.from(bookmarks)
		.where(and(eq(bookmarks.collectionId, id), isNull(bookmarks.deletedAt)));

	return { ...collection, bookmarkCount: countResult?.value ?? 0 };
}

export async function createCollection(db: DsqlDatabase, userId: string, data: { name: string; description?: string }) {
	const [collection] = await db
		.insert(collections)
		.values({ ...data, userId })
		.returning();
	return collection;
}

export async function updateCollection(
	db: DsqlDatabase,
	userId: string,
	id: string,
	data: { name?: string; description?: string | null },
) {
	const [collection] = await db
		.update(collections)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(collections.id, id), eq(collections.userId, userId), isNull(collections.deletedAt)))
		.returning();

	if (!collection) throw notFound("Collection");
	return collection;
}

export async function deleteCollection(db: DsqlDatabase, userId: string, id: string) {
	// Nullify collectionId on all bookmarks in this collection (app-layer cascade)
	await db
		.update(bookmarks)
		.set({ collectionId: null, updatedAt: new Date() })
		.where(and(eq(bookmarks.collectionId, id), isNull(bookmarks.deletedAt)));

	const [collection] = await db
		.update(collections)
		.set({ deletedAt: new Date() })
		.where(and(eq(collections.id, id), eq(collections.userId, userId), isNull(collections.deletedAt)))
		.returning();

	if (!collection) throw notFound("Collection");
	return collection;
}
