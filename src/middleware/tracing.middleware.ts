import {
  DanetMiddleware,
  HttpContext,
  Injectable,
  NextFunction,
} from '@danet/core';
//import { TelemetryService } from '@scope/telemetry';
import {
  context,
  SpanKind,
  SpanStatusCode,
  trace,
  Tracer,
} from '@opentelemetry/api';

@Injectable()
export class TracingMiddleware implements DanetMiddleware {
  private readonly tracer: Tracer;
  constructor(
    //private readonly service: TelemetryService,
  ) {
    this.tracer = trace.getTracer('http-middleware');
  }

  async action({ req, res }: HttpContext, next: NextFunction) {
    const { method, url, headers } = req.raw;
    // Create a span for this HTTP request
    const span = this.tracer.startSpan(`${method} ${req.path}`, {
      kind: SpanKind.SERVER,
      attributes: {
        // HTTP semantic conventions
        'http.request.method': method,
        'url.full': url.toString(),
        'url.path': req.path,
        'url.query': url.lastIndexOf('?') !== -1
          ? url.slice(url.lastIndexOf('?') + 1)
          : '',
        'user_agent.original': headers.get('user-agent') || '',
        'http.request.header.host': headers.get('host') || '',
        // Request size if available
        'http.request.body.size': headers.get('content-length')
          ? parseInt(headers.get('content-length')!)
          : undefined,
      },
    });

    const startTime = Date.now();

    try {
      await context.with(trace.setSpan(context.active(), span), async () => {
        await next();
      });

      const duration = Date.now() - startTime;

      span.setAttributes({
        'http.response.status_code': res.status,
        'http.response.body.size': res.headers.get('content-length')
          ? parseInt(res.headers.get('content-length')!)
          : undefined,
        'http.request.duration_ms': duration,
      });

      // Set span status based on HTTP status code
      if (res.status >= 400 && res.status < 500) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.status}`,
        });
      } else if (res.status >= 500) {
        span.recordException(
          new Error(`HTTP ${res.status}: Server Error`),
        );
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.status}`,
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
  }
}
