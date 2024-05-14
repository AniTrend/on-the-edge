import { Logtail } from "esm/logtail";
import { TokenReplacer } from 'x/optic/formatters';
import { BaseStream, Level, LogRecord } from 'x/optic';

export class LogtailStream extends BaseStream {
  private logtail: Logtail;

  constructor(clientKey: string) {
    super(new TokenReplacer());
    this.logtail = new Logtail(clientKey);
  }

  log(msg: string): void {
    this.logtail.log(msg);
    this.logtail.flush();
  }
  
  override handle(logRecord: LogRecord): boolean {
    const { level, metadata } = logRecord;
    if (this.minLevel > level) return false;
    const msg = this.format(logRecord);

    switch (level) { 
      case Level.Info:
        this.logtail.info(msg, { ...metadata });
        break; 
      case Level.Warn:
        this.logtail.warn(msg, { ...metadata });
        break; 
      case Level.Error:
        this.logtail.error(msg, { ...metadata });
        break; 
      case Level.Critical:
        this.logtail.log(msg, 'fatal', { ...metadata });
        break;
      default:
        return false;
    }

    this.logtail.flush();
    return true;
  }
}