import type * as ec2 from "aws-cdk-lib/aws-ec2";
import type * as rds from "aws-cdk-lib/aws-rds";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { DatabaseProxy } from "~lib/constructs/rds";
import { Api } from "~lib/patterns/api";

/**
 * Properties for the ApiStack.
 */
export type ApiStackProps = cdk.StackProps & {
	/**
	 * The Aurora DSQL cluster to connect to.
	 */
	readonly proxy: rds.DatabaseProxy;
	/**
	 * The VPC in which the function should run.
	 */
	readonly vpc: ec2.Vpc;
};

/**
 * Stack containing the API Lambda and related resources.
 */
export class ApiStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: ApiStackProps) {
		super(scope, id, props);

		// Lookup cross-stack dependencies
		const proxy = DatabaseProxy.getRef(this, "Proxy", props.proxy);

		new Api(this, "Api", {
			database: proxy,
			vpc: props.vpc,
		});
	}
}
