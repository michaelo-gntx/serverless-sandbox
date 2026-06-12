import * as path from "node:path";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { NodejsLambda } from "~lib/constructs/lambda";
import type { IDatabaseProxy } from "../database";

/**
 * Environment for the Sandbox API.
 */
type ApiEnv = {
	/**
	 * Hostname for the database cluster.
	 */
	DB_HOST: string;
	/**
	 * Name of the database.
	 */
	DB_NAME: string;
	/**
	 * Port for connecting to the cluster.
	 */
	DB_PORT: string;
	/**
	 * Name of the database user.
	 */
	DB_USER: string;
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
export interface ApiProps {
	/**
	 * The backing datastore for the API.
	 */
	readonly database: IDatabaseProxy;
	/**
	 * The VPC in which the function should run.
	 */
	readonly vpc: ec2.Vpc;
}

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
				DB_HOST: props.database.endpoint,
				DB_NAME: "postgres",
				DB_PORT: "5432",
				DB_USER: "postgres",
				NO_COLOR: "true",
				POWERTOOLS_LOG_LEVEL: "DEBUG",
			},
			vpc: props.vpc,
		});
		props.database.connections.allowFrom(this.handler, ec2.Port.POSTGRES, "API runner access");
		props.database.grantConnect(this.handler);

		const functionUrl = this.handler.addFunctionUrl({
			authType: lambda.FunctionUrlAuthType.NONE,
		});

		new cdk.CfnOutput(this, "ApiUrl", {
			value: functionUrl.url,
			description: "API Lambda function URL",
		});
	}
}
