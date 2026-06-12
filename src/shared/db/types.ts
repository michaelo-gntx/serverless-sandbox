import type { bookmarks, bookmarkTags, collections, tags, users } from "./schema";

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type BookmarkTag = typeof bookmarkTags.$inferSelect;
export type NewBookmarkTag = typeof bookmarkTags.$inferInsert;
