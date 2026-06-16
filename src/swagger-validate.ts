/**
 * Standalone OpenAPI contract validator.
 *
 * Reads the generated swagger-spec.json and validates it against
 * contract hygiene rules. Exits with code 1 on any violation.
 *
 * Usage: deno task swagger:validate
 */
import { assertOpenApiContract } from '@scope/common/openapi';

const SPEC_PATH = '.github/swagger-spec.json';

try {
  const content = Deno.readTextFileSync(SPEC_PATH);
  const doc = JSON.parse(content) as Record<string, unknown>;
  assertOpenApiContract(doc);
  console.log(`✓ OpenAPI contract validation passed: ${SPEC_PATH}`);
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    console.error(
      `✗ ${SPEC_PATH} not found. Run deno task swagger:generate first.`,
    );
    Deno.exit(1);
  }
  if (error instanceof SyntaxError) {
    console.error(`✗ ${SPEC_PATH} is not valid JSON: ${error.message}`);
    Deno.exit(1);
  }
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  Deno.exit(1);
}
