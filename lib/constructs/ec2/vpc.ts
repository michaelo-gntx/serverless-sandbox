import * as ec2 from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";

/**
 * Properties for a Virtual Private Cloud (VPC).
 */
export type VpcProps = Omit<ec2.VpcProps, "subnetConfiguration">;

/**
 * Wrapper for the Virtual Private Cloud (VPC) construct.
 * This provides safe defaults for a VPC, specifically subnet configuration.
 *
 * The following subnets are created:
 *
 * - Ingress: Public subnet for resources that need to be accessed from the internet.
 * - Application: Private subnet for resources than need internet access, typically applications.
 * - Database: Isolated subnet for resources that do not need internet access, typically datastores.
 *
 */
export class Vpc extends ec2.Vpc {
	/**
	 * @param scope The scope in which to define the construct.
	 * @param id The identifier for the construct.
	 * @param props Options for the VPC.
	 */
	constructor(scope: Construct, id: string, props?: VpcProps) {
		super(scope, id, {
			...props,
			subnetConfiguration: [
				{ name: "Ingress", subnetType: ec2.SubnetType.PUBLIC },
				{ name: "Application", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
				{ name: "Database", subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
			],
		});
	}
}
