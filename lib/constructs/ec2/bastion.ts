import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";
import { camelToKebab } from "~lib/utils/strings";

/**
 * Properties for a bastion host.
 */
export interface BastionProps {
	/**
	 * Whether to allow SSH access to the bastion host.
	 */
	readonly allowSsh?: boolean;
	/**
	 * The name for the EC2 instance.
	 */
	readonly name: string;
	/**
	 * The database to connect to.
	 */
	readonly database: ec2.IConnectable;
	/**
	 * The port for which the database will allow connections from.
	 */
	readonly port: number;
	/**
	 * The VPC in which to create the bastion host.
	 */
	readonly vpc: ec2.IVpc;
}

/**
 * Bastion host to access a database.
 */
export class DatabaseBastion extends ec2.BastionHostLinux {
	/**
	 * Create a new bastion host to access a database.
	 * @param scope The scope in which to define the construct.
	 * @param id The identifier for the construct.
	 * @param props Options for the bastion instance.
	 */
	constructor(scope: Construct, id: string, props: BastionProps) {
		super(scope, id, {
			instanceName: props.name,
			vpc: props.vpc,
		});

		// Add required policies for SSM agent
		this.role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));

		// Allow the bastion to connect to the RDS database
		props.database.connections.allowFrom(this, ec2.Port.tcp(props.port), "Bastion host access");

		// Allow SSH access to the bastion
		if (props.allowSsh) {
			this.allowSshAccessFrom(ec2.Peer.anyIpv4());
		}

		// Output the instance ID to the SSM parameter store
		new ssm.StringParameter(this, "InstanceId", {
			parameterName: `/ec2/${camelToKebab(props.name)}/instance-id`,
			stringValue: this.instanceId,
		});
	}
}
