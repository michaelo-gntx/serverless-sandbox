import * as ec2 from "aws-cdk-lib/aws-ec2";
import type { Construct } from "constructs";

/**
 * Wrapper for the Security Group construct.
 */
export class SecurityGroup extends ec2.SecurityGroup {
	/**
	 * Get a reference to an existing security group.
	 * @param scope The scope in which to define the resource reference.
	 * @param id The identifier for the construct.
	 * @param securityGroup The security group to reference.
	 * @returns The security group.
	 */
	static getRef(scope: Construct, id: string, sg: ec2.ISecurityGroup): ec2.ISecurityGroup {
		return ec2.SecurityGroup.fromSecurityGroupId(scope, `${id}Ref`, sg.securityGroupId, { allowAllOutbound: false });
	}
}
