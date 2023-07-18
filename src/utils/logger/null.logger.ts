import Logger from "./logger";

export default class NullLogger extends Logger {
    error(message: string, tag?: string): void { }
    log(message: string, tag?: string): void { }
}