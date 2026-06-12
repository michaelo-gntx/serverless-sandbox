import type { Tracer } from "@aws-lambda-powertools/tracer";
import type { Segment, Subsegment } from "aws-xray-sdk-core";
import { createMiddleware } from "hono/factory";

/**
 * Middleware for tracing API requests.
 * @param tracer Lambda Powertools tracer instance.
 * @returns The created middleware function.
 */
export const traceMethod = (tracer: Tracer) => {
	return createMiddleware<{
		Variables: {
			trace: Segment | Subsegment;
		};
	}>(async (c, next) => {
		const segment = tracer.getSegment();
		if (!segment) {
			await next();
			return;
		}

		const subsegment = segment.addNewSubsegment(`## ${c.req.method} ${c.req.path}`);
		tracer.setSegment(subsegment);
		c.set("trace", segment);

		try {
			await next();

			if (c.res) {
				subsegment.addMetadata("hono.response", c.res);
			}
		} catch (err) {
			subsegment.addError(err as Error);
			throw err;
		} finally {
			subsegment.close();
			tracer.setSegment(segment);
		}
	});
};
