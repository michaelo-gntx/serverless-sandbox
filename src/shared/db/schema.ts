import { relations, sql } from "drizzle-orm";
import { pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Reusable column helpers
// ---------------------------------------------------------------------------

const id = uuid().primaryKey().default(sql`gen_random_uuid()`);

const timestamps = {
	createdAt: timestamp().defaultNow().notNull(),
	updatedAt: timestamp().defaultNow().notNull(),
	deletedAt: timestamp(),
};

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
	id,
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	...timestamps,
});

export const collections = pgTable("collections", {
	id,
	userId: uuid().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	...timestamps,
});

export const bookmarks = pgTable("bookmarks", {
	id,
	userId: uuid().notNull(),
	collectionId: uuid(),
	url: text().notNull(),
	title: varchar({ length: 500 }).notNull(),
	description: text(),
	notes: text(),
	...timestamps,
});

export const tags = pgTable("tags", {
	id,
	userId: uuid().notNull(),
	name: varchar({ length: 255 }).notNull(),
	...timestamps,
});

export const bookmarkTags = pgTable(
	"bookmark_tags",
	{
		bookmarkId: uuid().notNull(),
		tagId: uuid().notNull(),
	},
	(t) => [primaryKey({ columns: [t.bookmarkId, t.tagId] })],
);

// ---------------------------------------------------------------------------
// Relations (app-level — no FK constraints in DSQL)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
	bookmarks: many(bookmarks),
	collections: many(collections),
	tags: many(tags),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
	user: one(users, {
		fields: [collections.userId],
		references: [users.id],
	}),
	bookmarks: many(bookmarks),
}));

export const bookmarksRelations = relations(bookmarks, ({ one, many }) => ({
	user: one(users, {
		fields: [bookmarks.userId],
		references: [users.id],
	}),
	collection: one(collections, {
		fields: [bookmarks.collectionId],
		references: [collections.id],
	}),
	bookmarkTags: many(bookmarkTags),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
	user: one(users, {
		fields: [tags.userId],
		references: [users.id],
	}),
	bookmarkTags: many(bookmarkTags),
}));

export const bookmarkTagsRelations = relations(bookmarkTags, ({ one }) => ({
	bookmark: one(bookmarks, {
		fields: [bookmarkTags.bookmarkId],
		references: [bookmarks.id],
	}),
	tag: one(tags, {
		fields: [bookmarkTags.tagId],
		references: [tags.id],
	}),
}));
