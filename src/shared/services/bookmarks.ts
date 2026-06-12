import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { bookmarks, bookmarkTags, tags } from "../db/schema";
import type { Tag } from "../db/types";
import { notFound } from "../errors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getTagsForBookmarks(db: Database, bookmarkIds: string[]): Promise<Map<string, Tag[]>> {
	if (bookmarkIds.length === 0) return new Map();

	const rows = await db
		.select({ bookmarkId: bookmarkTags.bookmarkId, tag: tags })
		.from(bookmarkTags)
		.innerJoin(tags, eq(bookmarkTags.tagId, tags.id))
		.where(and(inArray(bookmarkTags.bookmarkId, bookmarkIds), isNull(tags.deletedAt)));

	const map = new Map<string, Tag[]>();
	for (const row of rows) {
		const existing = map.get(row.bookmarkId) ?? [];
		existing.push(row.tag);
		map.set(row.bookmarkId, existing);
	}
	return map;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listBookmarks(
	db: Database,
	userId: string,
	opts: {
		limit: number;
		offset: number;
		collectionId?: string;
		tagId?: string;
		search?: string;
	},
) {
	const conditions = [eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)];

	if (opts.collectionId) {
		conditions.push(eq(bookmarks.collectionId, opts.collectionId));
	}

	if (opts.search) {
		conditions.push(
			sql`(${bookmarks.title} ILIKE ${"%" + opts.search + "%"} OR ${bookmarks.url} ILIKE ${"%" + opts.search + "%"})`,
		);
	}

	let baseQuery = db
		.select({ bookmark: bookmarks })
		.from(bookmarks)
		.where(and(...conditions));

	if (opts.tagId) {
		baseQuery = baseQuery.innerJoin(
			bookmarkTags,
			and(eq(bookmarkTags.bookmarkId, bookmarks.id), eq(bookmarkTags.tagId, opts.tagId)),
		) as typeof baseQuery;
	}

	const [data, totalResult] = await Promise.all([
		baseQuery.limit(opts.limit).offset(opts.offset),
		db
			.select({ value: count() })
			.from(bookmarks)
			.where(and(...conditions))
			.then((r) => r[0]),
	]);

	const bookmarkRows = data.map((r) => r.bookmark);
	const tagsMap = await getTagsForBookmarks(
		db,
		bookmarkRows.map((b) => b.id),
	);

	return {
		data: bookmarkRows.map((b) => ({ ...b, tags: tagsMap.get(b.id) ?? [] })),
		total: totalResult?.value ?? 0,
	};
}

export async function getBookmarkById(db: Database, userId: string, id: string) {
	const [bookmark] = await db
		.select()
		.from(bookmarks)
		.where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)))
		.limit(1);

	if (!bookmark) throw notFound("Bookmark");

	const tagsMap = await getTagsForBookmarks(db, [id]);
	return { ...bookmark, tags: tagsMap.get(id) ?? [] };
}

export async function createBookmark(
	db: Database,
	userId: string,
	data: {
		collectionId?: string;
		url: string;
		title: string;
		description?: string;
		notes?: string;
		tagIds?: string[];
	},
) {
	const { tagIds = [], ...rest } = data;

	const [bookmark] = await db
		.insert(bookmarks)
		.values({ ...rest, userId })
		.returning();

	if (tagIds.length > 0) {
		await db.insert(bookmarkTags).values(tagIds.map((tagId) => ({ bookmarkId: bookmark.id, tagId })));
	}

	const tagsMap = await getTagsForBookmarks(db, [bookmark.id]);
	return { ...bookmark, tags: tagsMap.get(bookmark.id) ?? [] };
}

export async function updateBookmark(
	db: Database,
	userId: string,
	id: string,
	data: {
		collectionId?: string | null;
		url?: string;
		title?: string;
		description?: string | null;
		notes?: string | null;
	},
) {
	const [bookmark] = await db
		.update(bookmarks)
		.set({ ...data, updatedAt: new Date() })
		.where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)))
		.returning();

	if (!bookmark) throw notFound("Bookmark");

	const tagsMap = await getTagsForBookmarks(db, [id]);
	return { ...bookmark, tags: tagsMap.get(id) ?? [] };
}

export async function deleteBookmark(db: Database, userId: string, id: string) {
	const [bookmark] = await db
		.update(bookmarks)
		.set({ deletedAt: new Date() })
		.where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)))
		.returning();

	if (!bookmark) throw notFound("Bookmark");

	// Hard-delete associated bookmark_tags (app-layer cascade)
	await db.delete(bookmarkTags).where(eq(bookmarkTags.bookmarkId, id));

	return bookmark;
}

export async function bulkDeleteBookmarks(db: Database, userId: string, ids: string[]) {
	const updated = await db
		.update(bookmarks)
		.set({ deletedAt: new Date() })
		.where(and(inArray(bookmarks.id, ids), eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)))
		.returning({ id: bookmarks.id });

	const deletedIds = updated.map((b) => b.id);

	if (deletedIds.length > 0) {
		await db.delete(bookmarkTags).where(inArray(bookmarkTags.bookmarkId, deletedIds));
	}

	return { deleted: deletedIds.length };
}

export async function bulkTagBookmarks(
	db: Database,
	userId: string,
	data: { bookmarkIds: string[]; tagIds: string[]; action: "add" | "remove" },
) {
	// Verify all bookmarks belong to this user
	const owned = await db
		.select({ id: bookmarks.id })
		.from(bookmarks)
		.where(and(inArray(bookmarks.id, data.bookmarkIds), eq(bookmarks.userId, userId), isNull(bookmarks.deletedAt)));

	const ownedIds = owned.map((b) => b.id);

	if (data.action === "add") {
		const pairs = ownedIds.flatMap((bookmarkId) => data.tagIds.map((tagId) => ({ bookmarkId, tagId })));
		if (pairs.length > 0) {
			await db.insert(bookmarkTags).values(pairs).onConflictDoNothing();
		}
	} else {
		if (ownedIds.length > 0) {
			await db
				.delete(bookmarkTags)
				.where(and(inArray(bookmarkTags.bookmarkId, ownedIds), inArray(bookmarkTags.tagId, data.tagIds)));
		}
	}

	return { updated: ownedIds.length };
}
