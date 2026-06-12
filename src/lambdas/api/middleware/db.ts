import { env } from "hono/adapter";
import { createMiddleware } from "hono/factory";
import { type Database, getDb } from "~src/shared/db/client";

type Env = {
	DB_HOST: string;
	DB_NAME: string;
	DB_PORT: number;
	DB_USER: string;
};

export const db = createMiddleware<{
	Variables: {
		db: Database;
	};
}>(async (c, next) => {
	const { DB_HOST, DB_NAME, DB_PORT, DB_USER } = env<Env>(c);
	const db = await getDb({
		host: DB_HOST,
		name: DB_NAME,
		port: DB_PORT,
		user: DB_USER,
	});
	c.set("db", db);
	await next();
});
