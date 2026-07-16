import { z } from '@scope/common/openapi';

export const HealthContract = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  uptime: z.number().openapi({ description: 'Uptime in milliseconds' }),
  timestamp: z.string().openapi({ description: 'ISO 8601 timestamp' }),
}).openapi({
  title: 'Health',
  description: 'Basic health metrics for the edge service',
});
