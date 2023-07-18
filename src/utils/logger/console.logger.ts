import Logger from "./logger";

export default class ConsoleLogger extends Logger {
    error(message: string, tag?: string): void {
        const content = this._prepareMessage(message, tag)
        console.error(content);
    }

    log(message: string, tag?: string): void {
        const content = this._prepareMessage(message, tag)
        console.log(content);
    }
}