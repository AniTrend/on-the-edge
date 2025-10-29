import { SeverityNumber } from '@opentelemetry/api-logs';
import { Stream } from '@onjara/optic';
import { Level, LogRecord } from '@onjara/optic';
import { Injectable } from '@danet/core';
import { logs } from '@opentelemetry/api-logs';

/**
 * OpenTelemetry Stream that forwards logs to the OpenTelemetry logs API
 * This allows Optic logs to be sent to Loki via OTLP
 */
@Injectable()
export class OtelStream implements Stream {
  private mapLevelToSeverity(level: Level): SeverityNumber {
    switch (level) {
      case Level.Debug:
        return SeverityNumber.DEBUG;
      case Level.Info:
        return SeverityNumber.INFO;
      case Level.Warn:
        return SeverityNumber.WARN;
      case Level.Error:
        return SeverityNumber.ERROR;
      case Level.Critical:
        return SeverityNumber.FATAL;
      default:
        return SeverityNumber.INFO;
    }
  }

  private mapLevelToString(level: Level): string {
    switch (level) {
      case Level.Debug:
        return 'DEBUG';
      case Level.Info:
        return 'INFO';
      case Level.Warn:
        return 'WARN';
      case Level.Error:
        return 'ERROR';
      case Level.Critical:
        return 'CRITICAL';
      default:
        return 'INFO';
    }
  }

  handle(record: LogRecord): boolean {
    const timestamp = record.dateTime.getTime() * 1000000; // Convert to nanoseconds

    // Extract structured attributes from metadata
    const attributes: Record<string, string | number | boolean> = {
      'log.level': this.mapLevelToString(record.level),
      'source.logger': 'optic',
    };

    // Add metadata as attributes if present
    if (record.metadata && typeof record.metadata === 'object') {
      Object.entries(record.metadata).forEach(([key, value]) => {
        if (
          typeof value === 'string' || typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          attributes[key] = value;
        } else {
          attributes[key] = String(value);
        }
      });
    }

    // Convert msg to string if it isn't already
    const body = typeof record.msg === 'string'
      ? record.msg
      : String(record.msg);

    // Emit the log record to OpenTelemetry
    logs.getLogger('optic-logger').emit({
      timestamp,
      severityNumber: this.mapLevelToSeverity(record.level),
      severityText: this.mapLevelToString(record.level),
      body,
      attributes,
    });

    return true; // Return true to indicate successful handling
  }
}
