import * as path from "node:path";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as sm from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as triggers from "aws-cdk-lib/triggers";
import { Construct } from "constructs";
import { DatabaseBastion } from "~lib/constructs/ec2/bastion";
import { NodejsLambda } from "~lib/constructs/lambda";
import { camelToKebab } from "~lib/utils/strings";

/**
 * Environment for the schema migrations runner.
 */
type MigrationsEnv = {
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
	 * The source directory for migration files.
	 */
	MIGRATIONS_DIR: string;
	/**
	 * Log level for the lambda function.
	 */
	POWERTOOLS_LOG_LEVEL: "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";
};

export interface IDatabaseProxy extends rds.IDatabaseProxy, ec2.IConnectable {}

/**
 * Properties for the Database construct.
 */
export interface PostgresProps {
	/**
	 * The name of the user in the database.
	 */
	readonly username?: string;
	/**
	 * The directory containing database migration files.
	 */
	readonly migrationsDir: string;
	/**
	 * The VPC in which to create the cluster.
	 */
	readonly vpc: ec2.Vpc;
}

export class Postgres extends Construct {
	readonly cluster: rds.DatabaseCluster;
	readonly proxy: rds.DatabaseProxy;

	/**
	 * @param scope The scope in which to define the construct.
	 * @param id The id of the construct.
	 * @param props Options for the database construct.
	 */
	constructor(scope: Construct, id: string, props: PostgresProps) {
		super(scope, id);

		// Create the credentials
		const username = props.username ?? "postgres";
		const credentials = new sm.Secret(this, "Credentials", {
			secretName: `${camelToKebab(id)}-credentials`,
			generateSecretString: {
				secretStringTemplate: JSON.stringify({ username }),
				generateStringKey: "password",
			},
		});

		// Create the cluster
		this.cluster = new rds.DatabaseCluster(this, "Cluster", {
			engine: rds.DatabaseClusterEngine.auroraPostgres({ version: rds.AuroraPostgresEngineVersion.VER_17_9 }),
			writer: rds.ClusterInstance.serverlessV2("Writer"),
			readers: [],
			credentials: rds.Credentials.fromSecret(credentials, username),
			vpcSubnets: {
				subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
			},
			vpc: props.vpc,
		});

		// Add a proxy
		this.proxy = this.cluster.addProxy("Proxy", {
			secrets: [credentials],
			iamAuth: true,
			vpc: props.vpc,
		});

		// Define the migrations runner
		const handler = NodejsLambda.fromFile<MigrationsEnv>(this, "Handler", {
			functionName: "MigrationsRunner",
			entry: path.join(__dirname, "..", "..", "..", "src", "lambdas", "migrations", "index.ts"),
			environment: {
				DB_HOST: this.proxy.endpoint,
				DB_NAME: "postgres",
				DB_PORT: "5432",
				DB_USER: username,
				MIGRATIONS_DIR: "./migrations",
				POWERTOOLS_LOG_LEVEL: "DEBUG",
			},
			bundling: {
				minify: true,
				// Copy the generated SQL migration files into ./migrations/ inside the Lambda bundle.
				// drizzle-kit outputs to ./drizzle/ at the repo root; the migration handler reads ./migrations/.
				commandHooks: {
					beforeBundling: () => [],
					beforeInstall: () => [],
					afterBundling: (inputDir: string, outputDir: string) => [
						`cp -r "${inputDir}/${props.migrationsDir}" "${outputDir}/migrations"`,
					],
				},
			},
			vpc: props.vpc,
		});

		this.proxy.connections.allowFrom(handler, ec2.Port.POSTGRES, "Migrations runner access");
		this.proxy.grantConnect(handler, username);

		// Trigger migrations during deployment
		const trigger = new triggers.Trigger(this, "Trigger", {
			handler,
		});
		trigger.executeAfter(this.cluster);

		// Bastion host for allowing outside connections.
		new DatabaseBastion(this, "Bastion", {
			name: "PostgresBastion",
			database: this.cluster,
			port: 5432,
			vpc: props.vpc,
		});

		// Output the instance ID to the SSM parameter store
		new ssm.StringParameter(this, "SecretARN", {
			parameterName: `/rds/${camelToKebab(id)}-cluster/secret-arn`,
			stringValue: credentials.secretArn,
		});
	}
}
