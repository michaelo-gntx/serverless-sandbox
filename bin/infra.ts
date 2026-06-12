#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { ApiStack } from "~lib/stacks/api-stack";
import { CoreStack } from "~lib/stacks/core-stack";
import { DatabaseStack } from "~lib/stacks/database-stack";

const app = new cdk.App();

const core = new CoreStack(app, "CoreStack", {});

const database = new DatabaseStack(app, "DatabaseStack", {
	vpc: core.vpc,
});

new ApiStack(app, "ApiStack", {
	proxy: database.proxy,
	vpc: core.vpc,
});
