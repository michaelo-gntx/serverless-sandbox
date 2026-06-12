import * as path from "node:path";
import type * as dsql from "@aws-cdk/aws-dsql-alpha";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { NodejsLambda } from "~lib/constructs/lambda";

/**
 * Environment for the Sandbox API.
 */
type ApiEnv = {
	/**
	 * Endpoint for the DB cluster.
	 */
	DB_ENDPOINT: string;
	/**
	 * Whether to disable color output in log messages.
	 */
	NO_COLOR: string;
	/**
	 * Log level for the lambda function.
	 */
	POWERTOOLS_LOG_LEVEL: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
};

/**
 * Properties for the API construct.
 */
export type ApiProps = {
	/**
	 * The backing datastore for the API.
	 */
	readonly cluster: dsql.Cluster;
};

export class Api extends Construct {
	readonly handler: lambda.Function;
	readonly functionUrl: lambda.FunctionUrl;

	/**
	 * @param scope The scope in which to define the construct.
	 * @param id The id of the construct.
	 * @param props Options for the API construct.
	 */
	constructor(scope: Construct, id: string, props: ApiProps) {
		super(scope, id);

		this.handler = NodejsLambda.fromFile<ApiEnv>(this, "Handler", {
			functionName: "SandboxAPI",
			entry: path.join(__dirname, "..", "..", "..", "src", "lambdas", "api", "index.ts"),
			environment: {
				DB_ENDPOINT: props.cluster.clusterEndpoint,
				NO_COLOR: "true",
				POWERTOOLS_LOG_LEVEL: "DEBUG",
			},
		});
		props.cluster.grantConnectAdmin(this.handler);

		const functionUrl = this.handler.addFunctionUrl({
			authType: lambda.FunctionUrlAuthType.NONE,
		});

		new cdk.CfnOutput(this, "ApiUrl", {
			value: functionUrl.url,
			description: "API Lambda function URL",
		});
	}
}
