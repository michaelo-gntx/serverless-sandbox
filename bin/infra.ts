#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { ApiStack } from "~lib/stacks/api-stack";
import { DatabaseStack } from "~lib/stacks/database-stack";

const app = new cdk.App();

const database = new DatabaseStack(app, "DatabaseStack", {
	migrationsDir: "migrations",
});

new ApiStack(app, "ApiStack", {
	cluster: database.cluster,
});
