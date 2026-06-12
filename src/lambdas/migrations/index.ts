import { Logger } from "@aws-lambda-powertools/logger";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { Database, Config as DB } from "~src/shared/db";
import { getDb } from "~src/shared/db";

interface Config {
	db: DB;
	source: string;
}

// Initialize observability tooling.
const serviceName = "Migrations";
const logger = new Logger({ serviceName });

const createConnection = async (config: DB): Promise<Database> => {
	logger.info("Connecting to database.");
	return await getDb(config);
};

/**
 * Load configuration from current environment.
 * @returns Lambda runtime configuration.
 */
const loadConfig = (): Config => {
	logger.info("Loading configuration from environment.");

	const migrations = process.env.MIGRATIONS_DIR || "./migrations";
	const port = parseInt(process.env.DB_PORT ?? "5432");

	const host = process.env.DB_HOST;
	if (!host) {
		throw new Error("DB_HOST environment variable is required.");
	}

	const name = process.env.DB_NAME;
	if (!name) {
		throw new Error("DB_NAME environment variable is required.");
	}

	const user = process.env.DB_USER;
	if (!user) {
		throw new Error("DB_USER environment variable is required.");
	}

	return {
		source: migrations,
		db: {
			host,
			name,
			port,
			user,
		},
	};
};

const runMigrations = async (db: Database, source: string): Promise<void> => {
	logger.info("Running database migrations.");
	await migrate(db, {
		migrationsFolder: source,
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
	const db = await createConnection(config.db);
	await runMigrations(db, config.source);
};
