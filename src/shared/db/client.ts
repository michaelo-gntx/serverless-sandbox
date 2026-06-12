import { Signer } from "@aws-sdk/rds-signer";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

export type Config = {
	host: string;
	name: string;
	port: number;
	user: string;
};

let db: Database | null = null;
let pool: Pool | null = null;

export async function getDb(config: Config): Promise<Database> {
	if (db) return db;

	const signer = new Signer({
		hostname: config.host,
		port: config.port,
		username: config.user,
	});

	pool = new Pool({
		host: config.host,
		port: config.port,
		user: config.user,
		password: await signer.getAuthToken(),
		database: config.name,
		ssl: { rejectUnauthorized: false },
	});

	db = drizzle({ client: pool, schema, casing: "snake_case" });

	return db;
}
