import { context, SpanKind, SpanStatusCode, trace } from '@otel';
import type { AppContext } from '../types/core.ts';

const tracer = trace.getTracer('on-the-edge-middleware', '1.0.0');

export default async (
  ctx: AppContext,
  next: () => Promise<unknown>,
) => {
  const { request, response } = ctx;

  // Create a span for this HTTP request
  const span = tracer.startSpan(`${request.method} ${request.url.pathname}`, {
    kind: SpanKind.SERVER,
    attributes: {
      // HTTP semantic conventions
      'http.request.method': request.method,
      'url.full': request.url.toString(),
      'url.scheme': request.url.protocol.slice(0, -1), // Remove trailing ':'
      'server.address': request.url.hostname,
      'server.port': request.url.port ? parseInt(request.url.port) : (request.url.protocol === 'https:' ? 443 : 80),
      'url.path': request.url.pathname,
      'url.query': request.url.search,
      'user_agent.original': request.headers.get('user-agent') || '',
      'http.request.header.host': request.headers.get('host') || '',
      // Request size if available
      'http.request.body.size': request.headers.get('content-length') ? parseInt(request.headers.get('content-length')!) : undefined,
    },
  });

  const startTime = Date.now();

  try {
    await context.with(trace.setSpan(context.active(), span), async () => {
      await next();
    });

    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'http.response.status_code': response.status,
      'http.response.body.size': response.headers.get('content-length') ? parseInt(response.headers.get('content-length')!) : undefined,
      'http.request.duration_ms': duration,
    });

    // Set span status based on HTTP status code
    if (response.status >= 400 && response.status < 500) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR,
        message: `HTTP ${response.status}` 
      });
    } else if (response.status >= 500) {
      span.recordException(new Error(`HTTP ${response.status}: Server Error`));
      span.setStatus({ 
        code: SpanStatusCode.ERROR,
        message: `HTTP ${response.status}` 
      });
    } else {
      span.setStatus({ code: SpanStatusCode.OK });
    }
  } catch (error: Error | unknown) {
    const errorObj = error as Error;
    span.recordException(errorObj);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: errorObj.message || 'Unknown error',
    });
    
    // Add error attributes
    span.setAttributes({
      'error.type': errorObj.constructor.name,
      'error.message': errorObj.message,
    });
    
    throw error;
  } finally {
    span.end();
  }
};
