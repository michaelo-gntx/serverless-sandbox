import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type DsqlDatabase = NodePgDatabase<typeof schema>;

let dbInstance: DsqlDatabase | null = null;
let pool: AuroraDSQLPool | null = null;

export function getDb(): DsqlDatabase {
	if (dbInstance) {
		return dbInstance;
	}

	const endpoint = process.env.DB_ENDPOINT;
	if (!endpoint) {
		throw new Error("DB_ENDPOINT environment variable is required.");
	}

	pool = new AuroraDSQLPool({
		host: endpoint,
		user: "admin",
	});

	dbInstance = drizzle({ client: pool, schema, casing: "snake_case" });

	return dbInstance;
}
