import type * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { Vpc } from "~lib/constructs/ec2";

/**
 * Properties for the CoreStack.
 */
export interface CoreStackProps extends cdk.StackProps {}

/**
 * Stack containing core application resources.
 */
export class CoreStack extends cdk.Stack {
	readonly vpc: ec2.Vpc;

	/**
	 * @param scope The scope in which to define the stack.
	 * @param id The id of the stack.
	 * @param props Options for the database stack.
	 */
	constructor(scope: Construct, id: string, props: CoreStackProps) {
		super(scope, id, props);
		this.vpc = new Vpc(this, "Vpc");
	}
}
