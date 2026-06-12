import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import type { Construct } from "constructs";
import { SecurityGroup } from "../ec2";

export interface IDatabaseProxy extends rds.IDatabaseProxy, ec2.IConnectable {}

export class DatabaseProxy extends rds.DatabaseProxy {
	static getRef(scope: Construct, id: string, proxy: rds.DatabaseProxy): IDatabaseProxy {
		const securityGroups = proxy.connections.securityGroups.map((sg, i) =>
			SecurityGroup.getRef(scope, `${id}SecurityGroup${i}Ref`, sg),
		);
		const ref = rds.DatabaseProxy.fromDatabaseProxyAttributes(scope, `${id}Ref`, {
			dbProxyArn: proxy.dbProxyArn,
			dbProxyName: proxy.dbProxyName,
			endpoint: proxy.endpoint,
			securityGroups,
		});
		const connections = new ec2.Connections({
			defaultPort: ec2.Port.POSTGRES,
			securityGroups,
		});
		return {
			...ref,
			grantConnect: (grantee, user = "postgres") => ref.grantConnect(grantee, user),
			connections,
		};
	}
}
