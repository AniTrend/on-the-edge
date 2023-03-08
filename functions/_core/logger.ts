import { setup, handlers, getLogger, LogConfig } from "std/log"

const config: LogConfig = {
  handlers: {
    functionFmt: new handlers.ConsoleHandler("DEBUG", {
        formatter: (logRecord) => {
          let msg = `${logRecord.datetime.toISOString()} | ${logRecord.loggerName} | ${logRecord.levelName} - ${logRecord.msg}`

          logRecord.args.forEach((arg, index) => {
            msg += `, arg${index}: ${arg}`
          })

          return msg
      }
    }),
  },

  loggers: {
    "default": {
      level: "DEBUG",
      handlers: ["functionFmt"],
    },
  },
}

setup(config)

export default getLogger("default")
