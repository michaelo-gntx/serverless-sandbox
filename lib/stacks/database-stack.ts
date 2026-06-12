import type * as ec2 from "aws-cdk-lib/aws-ec2";
import type * as rds from "aws-cdk-lib/aws-rds";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { Postgres } from "~lib/patterns/database";

/**
 * Properties for the DatabaseStack.
 */
export interface DatabaseStackProps extends cdk.StackProps {
	/**
	 * The VPC in which to create the DB.
	 */
	readonly vpc: ec2.Vpc;
}

/**
 * Stack containing stateful database resources.
 * Separated from the API stack to protect data during deployments.
 */
export class DatabaseStack extends cdk.Stack {
	readonly proxy: rds.DatabaseProxy;

	/**
	 * @param scope The scope in which to define the stack.
	 * @param id The id of the stack.
	 * @param props Options for the database stack.
	 */
	constructor(scope: Construct, id: string, props: DatabaseStackProps) {
		super(scope, id, props);
		const database = new Postgres(this, "Postgres", {
			migrationsDir: "drizzle",
			vpc: props.vpc,
		});
		this.proxy = database.proxy;
	}
}
