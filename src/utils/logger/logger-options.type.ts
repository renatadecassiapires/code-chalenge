import { LoggerType } from "./logger.type";

export interface LoggerOptions {
    readonly type: LoggerType;
    readonly outputFile?: string;
}