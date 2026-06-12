import type { Segment, Subsegment } from "aws-xray-sdk-core";
import type { LambdaContext, LambdaEvent } from "hono/aws-lambda";
import type { Database } from "~src/shared/db";

export type AppEnv = {
	Bindings: {
		event: LambdaEvent;
		context: LambdaContext;
	};
	Variables: {
		userId: string;
		db: Database;
		trace: Segment | Subsegment;
	};
};
