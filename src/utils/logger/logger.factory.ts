import ConsoleLogger from "./console.logger";
import FileLogger from "./file.logger";
import Logger from "./logger";
import { LoggerOptions } from "./logger-options.type";
import { LoggerType } from "./logger.type";
import NullLogger from "./null.logger";

export default class LoggerFactory {
    static createInstance(options: LoggerOptions): Logger {
        switch (options.type) {
            case LoggerType.CONSOLE:
                return new ConsoleLogger();
            
            case LoggerType.FILE:
                if (!options.outputFile) throw new Error("options.outputFile is required!");
                return new FileLogger(options.outputFile);

            default:
                return new NullLogger();
        }
    }
}