/** logger.ts */
import { SummaryMeasureFormatter } from 'x/optic/profiler';
import { ConsoleStream, Level, Logger } from 'x/optic';
import { TokenReplacer } from 'x/optic/formatters';
import { RegExpFilter } from 'x/optic/regex-filter';

const regex = RegExp(/[&?]+/);
const regExpFilter = new RegExpFilter(regex);
export const logger = new Logger().addFilter(regExpFilter);

logger.profilingConfig()
  .enabled(true) //Enable or disable all recording of marks or measures
  .captureMemory(false) //Enable or disable capturing of memory information
  .captureOps(false) //Enable or disable capturing of ops calls
  .withLogLevel(Level.Info) //Set the log level at which the profile measure is output
  .withFormatter(new SummaryMeasureFormatter()); //Formats the profiling log message

logger.addStream(
  new ConsoleStream()
    .withFormat(
      new TokenReplacer()
        .withFormat('{msg}')
        .withColor(),
    ),
);
