#!/usr/bin/env bun
// ---------------------------------------------------------------------------
// Start a remote session to a RDS database via a bastion host.
// ---------------------------------------------------------------------------

import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { SSM } from "@aws-sdk/client-ssm";

const ssm = new SSM({});
const secretsManager = new SecretsManager({});

/**
 * Get a parameter value from the AWS SSM Parameter Store.
 */
async function getParameter(name: string): Promise<string> {
	const response = await ssm.getParameter({ Name: name });

	const value = response.Parameter?.Value;
	if (!value) {
		throw new Error(`SSM parameter not found: ${name}`);
	}

	return value;
}

/**
 * Get a secret string value from AWS Secrets Manager.
 */
async function getSecret(secretArn: string): Promise<string> {
	const response = await secretsManager.getSecretValue({ SecretId: secretArn });

	const value = response.SecretString;
	if (!value) {
		throw new Error(`Secret not found or has no string value: ${secretArn}`);
	}

	return value;
}

/**
 * Start an SSM port-forwarding session to the database host via the bastion.
 * Uses Bun.spawn because start-session drives the local session-manager-plugin
 * binary — there is no AWS SDK equivalent for this operation.
 */
async function startSession(instanceId: string, hostName: string): Promise<void> {
	const parameters = JSON.stringify({
		host: [hostName],
		portNumber: ["5432"],
		localPortNumber: ["5432"],
	});

	const proc = Bun.spawn(
		[
			"aws",
			"ssm",
			"start-session",
			"--target",
			instanceId,
			"--document-name",
			"AWS-StartPortForwardingSessionToRemoteHost",
			"--parameters",
			parameters,
			"--no-cli-pager",
		],
		{ stdout: "inherit", stderr: "inherit" },
	);

	const code = await proc.exited;
	if (code !== 0) {
		throw new Error(`SSM session exited with code ${code}`);
	}
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	const instanceId = await getParameter("/ec2/postgres-bastion/instance-id");
	const secretArn = await getParameter("/rds/postgres-cluster/secret-arn");

	// SecretString contains a JSON object — parse it to extract the host.
	const secret = JSON.parse(await getSecret(secretArn)) as Record<string, unknown>;
	const hostName = secret["host"] as string;

	await startSession(instanceId, hostName);
}

main().catch((err: unknown) => {
	if (err instanceof Error) {
		console.error(err.name, err.message);
		if ("$metadata" in err) {
			console.error(JSON.stringify((err as Record<string, unknown>)["$metadata"], null, 2));
		}
	} else {
		console.error(err);
	}
	process.exit(1);
});
