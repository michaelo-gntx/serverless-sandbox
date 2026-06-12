import * as path from "node:path";
import * as dsql from "@aws-cdk/aws-dsql-alpha";
import * as triggers from "aws-cdk-lib/triggers";
import { Construct } from "constructs";
import { NodejsLambda } from "~lib/constructs/lambda";

/**
 * Environment for the schema migrations runner.
 */
type MigrationsEnv = {
	/**
	 * Endpoint for the DB cluster.
	 */
	DB_ENDPOINT: string;
	/**
	 * The source directory for migration files.
	 */
	MIGRATIONS_DIR: string;
	/**
	 * Log level for the lambda function.
	 */
	POWERTOOLS_LOG_LEVEL: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
};

/**
 * Properties for the Database construct.
 */
export type AuroraDsqlProps = {
	/**
	 * The name of the Aurora DSQL cluster.
	 */
	readonly clusterName?: string;
};

export class AuroraDsql extends Construct {
	readonly cluster: dsql.Cluster;

	/**
	 * @param scope The scope in which to define the construct.
	 * @param id The id of the construct.
	 * @param props Options for the database construct.
	 */
	constructor(scope: Construct, id: string, props: AuroraDsqlProps) {
		super(scope, id);

		// Create the database cluster
		this.cluster = new dsql.Cluster(this, "Cluster", {
			clusterName: props.clusterName ?? "SandboxDB",
			deletionProtection: false,
		});

		// Define the migrations runner
		const handler = NodejsLambda.fromFile<MigrationsEnv>(this, "Handler", {
			functionName: "MigrationsRunner",
			entry: path.join(__dirname, "..", "..", "..", "src", "lambdas", "migrations", "index.ts"),
			environment: {
				DB_ENDPOINT: this.cluster.clusterEndpoint,
				MIGRATIONS_DIR: "./migrations",
				POWERTOOLS_LOG_LEVEL: "DEBUG",
			},
			bundling: {
				minify: true,
				// Copy the generated SQL migration files into ./migrations/ inside the Lambda bundle.
				// drizzle-kit outputs to ./drizzle/ at the repo root; the migration handler reads ./migrations/.
				commandHooks: {
					beforeBundling: () => [],
					beforeInstall: () => [],
					afterBundling: (inputDir: string, outputDir: string) => [
						`cp -r "${inputDir}/drizzle" "${outputDir}/migrations"`,
					],
				},
			},
		});
		this.cluster.grantConnectAdmin(handler);

		// Trigger migrations during deployment
		const trigger = new triggers.Trigger(this, "Trigger", {
			handler,
		});
		trigger.executeAfter(this.cluster);
	}
}
