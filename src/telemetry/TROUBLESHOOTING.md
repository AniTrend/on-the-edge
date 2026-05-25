# OTEL Logs Missing While Traces Work

Use this runbook when traces are visible but application logs are missing in
Grafana Loki.

## Symptoms

- Traces for a service are visible in Tempo/Grafana.
- Loki mostly shows infrastructure logs (for example `traefik`).
- Application logs for the same service are absent.

## Decision Tree

1. **Collector receives logs?**
   - If no: issue is app emission or app-to-collector transport.
   - If yes: continue.
2. **Collector exports logs successfully?**
   - If no: issue is collector exporter config/connectivity.
   - If yes: continue.
3. **Loki indexes expected service label?**
   - If no: issue is label/resource mapping.
   - If yes: continue.
4. **Direct Loki `query_range` returns service logs?**
   - If no: issue is ingest/drop path or tenant mismatch.
   - If yes: issue is Grafana query/time range/datasource config.

## Commands

Run on the observability host (example machine: `pophub`).

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}' \
  | egrep -i 'loki|tempo|otel|collector|traefik|edge-graphql'

docker logs --since 15m otel-collector 2>&1 \
  | grep -Ei 'otlp|logs|export|loki|error|dropped|failed'

docker logs --since 15m loki 2>&1 \
  | grep -Ei 'error|warn|otlp|push|query'
```

If Loki is not bound on host `localhost:3100`, run queries from a container on
the same Docker network:

```bash
docker run --rm --network traefik curlimages/curl:8.10.1 \
  -sG 'http://loki:3100/loki/api/v1/label/service_name/values'
```

Use range queries for log streams:

```bash
START_NS=$(($(date -u +%s)-1800))000000000
END_NS=$(date -u +%s)000000000

docker run --rm --network traefik curlimages/curl:8.10.1 \
  -sG 'http://loki:3100/loki/api/v1/query_range' \
  --data-urlencode 'query={service_name="on-the-edge"}' \
  --data-urlencode "start=${START_NS}" \
  --data-urlencode "end=${END_NS}" \
  --data-urlencode 'limit=100'
```

## Application-Side Root Cause Seen In This Repo

`OtelStream` emits logs through the global OpenTelemetry `LoggerProvider`.
If that provider is created without processors, `emit()` calls do not export.

Required provider wiring:

- Create `BatchLogRecordProcessor` with `OTLPLogExporter`.
- Pass it to `LoggerProvider` via `processors: [...]`.
- Set the provider globally with `logs.setGlobalLoggerProvider(...)`.
- Shutdown the provider on app close to flush batched records.

## Remediation Checklist

- Verify `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` is reachable from app runtime.
- Verify collector logs pipeline has receiver + processors + Loki exporter.
- Verify Loki label keys used in queries (`service_name` vs `service.name`).
- Verify app logger provider includes processors.
- Verify graceful shutdown flush for logger provider.
