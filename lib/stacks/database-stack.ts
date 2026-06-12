import type * as dsql from "@aws-cdk/aws-dsql-alpha";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { Database } from "~lib/patterns/database";

/**
 * Properties for the DatabaseStack.
 */
export type DatabaseStackProps = cdk.StackProps & {
	/**
	 * The directory containing database migration files.
	 */
	readonly migrationsDir: string;
};

/**
 * Stack containing stateful database resources.
 * Separated from the API stack to protect data during deployments.
 */
export class DatabaseStack extends cdk.Stack {
	readonly cluster: dsql.Cluster;

	constructor(scope: Construct, id: string, props: DatabaseStackProps) {
		super(scope, id, props);
		const database = new Database(this, "Database", {});
		this.cluster = database.cluster;
	}
}
