import { SummaryMeasureFormatter } from 'x/optic/profiler';
import { ConsoleStream, Level, Logger } from 'x/optic';
import { TokenReplacer } from 'x/optic/formatters';
//import { RegExpFilter } from 'x/optic/regex-filter';

//const regex = RegExp(/[&?]+/);
//const regExpFilter = new RegExpFilter(regex);
export const logger = new Logger(); //.addFilter(regExpFilter);

logger.profilingConfig()
  .enabled(true)
  .captureMemory(true)
  .captureOps(true)
  .withLogLevel(Level.Info)
  .withFormatter(new SummaryMeasureFormatter());

logger.addStream(
  new ConsoleStream()
    .withFormat(
      new TokenReplacer()
        .withFormat('{msg} {metadata}')
        .withColor(),
    ),
);
