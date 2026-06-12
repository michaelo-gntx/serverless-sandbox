import type { Segment, Subsegment } from "aws-xray-sdk-core";
import type { LambdaContext, LambdaEvent } from "hono/aws-lambda";

export type AppEnv = {
	Bindings: {
		event: LambdaEvent;
		context: LambdaContext;
	};
	Variables: {
		userId: string;
		trace: Segment | Subsegment;
	};
};
