import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AuroraDSQLPool } from "@aws/aurora-dsql-node-postgres-connector";
import { Logger } from "@aws-lambda-powertools/logger";

const MIGRATIONS_TABLE = "__drizzle_migrations";

interface Config {
	db: {
		endpoint: string;
	};
	source: string;
}

interface Migration {
	tag: string;
	sql: string;
}

// Initialize observability tooling.
const serviceName = "Migrations";
const logger = new Logger({ serviceName });

/**
 * Apply all pending schema migrations.
 * @param conn Database connection pool.
 */
const applyMigrations = async (conn: AuroraDSQLPool, source: string): Promise<void> => {
	logger.info("Running database migrations.");

	// Get the list of migrations that need to be applied.
	const applied = await getApplied(conn);
	const pending = readFiles(source).filter((m) => !applied.has(m.tag));

	for (const migration of pending) {
		logger.info(`Applying migration ${migration.tag}.`);

		const statements = migration.sql
			.split("--> statement-breakpoint")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		for (const stmt of statements) {
			await conn.query(stmt);
		}

		await conn.query(`INSERT INTO "${MIGRATIONS_TABLE}" (id, hash, tag, created_at) VALUES ($1, $2, $3, $4)`, [
			crypto.randomUUID(),
			crypto.createHash("sha256").update(migration.sql).digest("hex"),
			migration.tag,
			Date.now(),
		]);
	}
};

/**
 * Create a database connection.
 * @param endpoint URI endpoint for the database cluster.
 * @returns The created connection.
 */
const createConnection = (endpoint: string): AuroraDSQLPool => {
	logger.info("Creating database connection.");
	return new AuroraDSQLPool({
		host: endpoint,
		user: "admin",
		options: `-c search_path=public`,
	});
};

/**
 * Create the migrations tracking table.
 * @param conn Database connection pool.
 */
const createTable = async (conn: AuroraDSQLPool): Promise<void> => {
	logger.info("Ensuring migrations table exists.");
	await conn.query(`
        CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            hash text NOT NULL,
            tag text NOT NULL,
            created_at bigint
        )
    `);
};

/**
 * Get the list of applied migrations from the database.
 * @param  conn Database connection pool.
 * @returns The list of applied mitrations.
 */
const getApplied = async (conn: AuroraDSQLPool): Promise<Set<string>> => {
	const result = await conn.query(`SELECT tag FROM "${MIGRATIONS_TABLE}" ORDER BY created_at`);
	return new Set(result.rows.map((r: { tag: string }) => r.tag));
};

/**
 * Load configuration from current environment.
 * @returns Lambda runtime configuration.
 */
const loadConfig = (): Config => {
	logger.info("Loading configuration from environment.");

	const migrations = process.env.MIGRATIONS_DIR || "./migrations";

	const endpoint = process.env.DB_ENDPOINT;
	if (!endpoint) {
		throw new Error("DB_ENDPOINT environment variable is required.");
	}

	return {
		source: migrations,
		db: {
			endpoint,
		},
	};
};

/**
 * Read migrations from file.
 * @param source The migrations source directory.
 * @returns The list of migrations.
 */
const readFiles = (source: string): Migration[] => {
	logger.info("Loading migrations from source directory.");
	const journal = JSON.parse(fs.readFileSync(path.join(source, "meta", "_journal.json"), "utf-8")) as {
		entries: Array<{ tag: string }>;
	};

	return journal.entries.map((e) => {
		const file = path.join(source, `${e.tag}.sql`);
		return {
			tag: e.tag,
			sql: fs.readFileSync(file, "utf-8"),
		};
	});
};

/**
 * Entry point for the Lambda function.
 * @param _event The incoming event that triggered the Lambda function.
 * @param _context Lambda execution context.
 */
export const handler = async (_event: unknown, _context: unknown): Promise<void> => {
	logger.info("Starting database migration process.");
	const config = loadConfig();
	const conn = createConnection(config.db.endpoint);
	await createTable(conn);
	await applyMigrations(conn, config.source);
};
