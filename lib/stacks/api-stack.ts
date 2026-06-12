import type * as dsql from "@aws-cdk/aws-dsql-alpha";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { Api } from "~lib/patterns/api";

/**
 * Properties for the ApiStack.
 */
export type ApiStackProps = cdk.StackProps & {
	/**
	 * The Aurora DSQL cluster to connect to.
	 */
	readonly cluster: dsql.Cluster;
};

/**
 * Stack containing the API Lambda and related resources.
 */
export class ApiStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: ApiStackProps) {
		super(scope, id, props);
		new Api(this, "Api", {
			cluster: props.cluster,
		});
	}
}
