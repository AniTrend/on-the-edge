import { AppModule } from './app.module.ts';
import { DanetApplication } from '@danet/core';
import { SpecBuilder, SwaggerModule } from '@danet/swagger';
import {
  GrowthBookMiddleware,
  HeaderMiddleware,
  LoggerMiddleware,
  TracingMiddleware,
} from '@scope/middleware';
import {
  assertOpenApiContract,
  normalizeOpenApiDocument,
} from '@scope/common/openapi';
import { trace } from '@opentelemetry/api';

type Spec = ReturnType<SpecBuilder['build']>;

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

    const rawDocument = await SwaggerModule.createDocument(application, spec);
    const normalized = normalizeOpenApiDocument(
      rawDocument as unknown as Record<string, unknown>,
    );
    assertOpenApiContract(normalized);
    const document = normalized as unknown as Spec;
    await SwaggerModule.setup('docs', application, document);
    Deno.writeTextFileSync(
      '.github/swagger-spec.json',
      JSON.stringify(normalized, null, 2),
    );
  }

  application.addGlobalMiddlewares(
    LoggerMiddleware,
    TracingMiddleware,
    HeaderMiddleware,
    GrowthBookMiddleware,
  );
  span.end();
};
