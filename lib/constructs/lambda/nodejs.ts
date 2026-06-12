import * as cdk from "aws-cdk-lib";
import { Architecture, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, type NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Duration } from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { camelToKebab } from "~lib/utils/strings";

/**
 * Base type for lambda environment.
 */
type LambdaEnv = { [key: string]: string };

/**
 * Properties for a Node.js lambda function.
 */
export type NodejsLambdaProps<T extends LambdaEnv> = Omit<
	NodejsFunctionProps,
	"environment" | "logRetention" | "runtime"
> & {
	/**
	 * Environment variables required by the lambda function.
	 */
	environment: T;
};

/**
 * Wrapper for the Node.js lambda function construct.
 * This allows for type safety of the lambda environment variables.
 */
export class NodejsLambda<T extends LambdaEnv> extends NodejsFunction {
	/**
	 * @param scope The scope in which to define the construct.
	 * @param id The id of the construct.
	 * @param props Options for the lambda function.
	 */
	constructor(scope: Construct, id: string, props: NodejsLambdaProps<T>) {
		super(scope, id, {
			handler: "handler",
			architecture: Architecture.ARM_64,
			runtime: Runtime.NODEJS_24_X,
			timeout: Duration.seconds(30),
			tracing: Tracing.ACTIVE,
			bundling: { minify: true, externalModules: [] },
			logGroup: new logs.LogGroup(scope, `${id}LogGroup`, {
				logGroupName: `/aws/lambda/${camelToKebab(props.functionName ?? scope.node.id + id)}`,
				retention: logs.RetentionDays.ONE_MONTH,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
			}),
			...props,
			environment: { ...props.environment, NODE_ENV: "production" },
		});
	}

	/**
	 * @param scope The scope in which to define the construct.
	 * @param id The id of the construct.
	 * @param props Options for the lambda function.
	 * @returns The created lambda function.
	 */
	static fromFile<T extends LambdaEnv>(scope: Construct, id: string, props: NodejsLambdaProps<T>): NodejsLambda<T> {
		return new NodejsLambda(scope, id, props);
	}
}
