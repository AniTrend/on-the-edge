import { context, SpanKind, SpanStatusCode, trace } from '@otel';
import type { AppContext } from '../types/core.ts';

const tracer = trace.getTracer('on-the-edge-middleware');

export default async (
  ctx: AppContext,
  next: () => Promise<unknown>,
) => {
  const { request, response } = ctx;

  // Create a span for this HTTP request
  const span = tracer.startSpan(`${request.method} ${request.url.pathname}`, {
    kind: SpanKind.SERVER,
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
    await context.with(trace.setSpan(context.active(), span), async () => {
      await next();
    });

    span.setAttributes({
      'http.status_code': response.status,
      'http.response.size': parseInt(
        response.headers.get('content-length') || '0',
        10,
      ),
    });

    if (response.status >= 400) {
      span.recordException(new Error(`HTTP ${response.status}`));
      span.setStatus({ code: SpanStatusCode.ERROR });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
  } catch (error: Error | unknown) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message,
    });
    throw error;
  } finally {
    span.end();
  }
};
