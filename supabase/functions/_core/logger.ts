import { getLogger, handlers, LogConfig, setup } from "std/log";

const config: LogConfig = {
  handlers: {
    functionFmt: new handlers.ConsoleHandler("NOTSET", {
      formatter: (logRecord) => {
        let msg = `${logRecord.levelName} - ${logRecord.msg}`;

        logRecord.args.forEach((arg, index) => {
          msg += `, arg${index}: ${arg}`;
        });

        return msg;
      },
    }),
  },

  loggers: {
    "dev": {
      level: "DEBUG",
      handlers: ["functionFmt"],
    },
    "prod": {
      level: "WARNING",
      handlers: ["functionFmt"],
    },
  },
};

setup(config);

export default getLogger;
