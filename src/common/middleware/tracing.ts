import { context, trace } from '@otel';
import type { AppContext } from '../types/core.ts';

const tracer = trace.getTracer('on-the-edge-middleware');

export default async (
  ctx: AppContext,
  next: () => Promise<unknown>,
) => {
  const { request, response } = ctx;

  // Create a span for this HTTP request
  const span = tracer.startSpan(`${request.method} ${request.url.pathname}`, {
    kind: 1, // SERVER span
    attributes: {
      'http.method': request.method,
      'http.url': request.url.toString(),
      'http.scheme': request.url.protocol.slice(0, -1), // Remove trailing ':'
      'http.host': request.url.host,
      'http.target': request.url.pathname + request.url.search,
      'user_agent.original': request.headers.get('user-agent') || '',
    },
  });

  try {
    // Run the request in the span context
    await context.with(trace.setSpan(context.active(), span), async () => {
      await next();
    });

    // Set response attributes
    span.setAttributes({
      'http.status_code': response.status,
      'http.response.size': response.headers.get('content-length') || 0,
    });

    // Set span status based on HTTP status
    if (response.status >= 400) {
      span.recordException(new Error(`HTTP ${response.status}`));
      span.setStatus({ code: 2 }); // ERROR
    } else {
      span.setStatus({ code: 1 }); // OK
    }
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
    throw error;
  } finally {
    span.end();
  }
};
