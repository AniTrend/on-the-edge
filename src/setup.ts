import { AppModule } from './app.module.ts';
import { DanetApplication } from '@danet/core';
import { SpecBuilder, SwaggerModule } from '@danet/swagger';
import {
  GrowthBookMiddleware,
  HeaderMiddleware,
  LoggerMiddleware,
  TracingMiddleware,
} from '@scope/middleware';
import { trace } from '@opentelemetry/api';

export const setup = async (
  application: DanetApplication,
  swaggerSpec: boolean,
): Promise<void> => {
  await application.init(AppModule);

  const tracer = trace.getTracer('bootstrap');
  const span = tracer.startSpan('setup');

  if (swaggerSpec) {
    const spec = new SpecBuilder()
      .setTitle('Edge API')
      .setDescription('The edge API')
      .setVersion('1.0')
      .build();

    const document = await SwaggerModule.createDocument(application, spec);
    await SwaggerModule.setup('docs', application, document);
    const stream = new TextEncoder().encode(JSON.stringify(document));
    Deno.writeFileSync('.github/swagger-spec.json', stream);
  }

  application.addGlobalMiddlewares(
    LoggerMiddleware,
    TracingMiddleware,
    HeaderMiddleware,
    GrowthBookMiddleware,
  );
  span.end();
};
