import type { Environment } from "aws-cdk-lib";
import { ENV } from "varlock/env";

interface CDK {
	env: Environment;
}

interface Config {
	cdk: CDK;
}

export const config: Config = {
	cdk: {
		env: {
			account: ENV.CDK_DEFAULT_ACCOUNT,
			region: ENV.CDK_DEFAULT_REGION,
		},
	},
};
