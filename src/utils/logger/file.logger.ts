import fs = require("fs");
import Logger from "./logger";

export default class FileLogger extends Logger {
    constructor(
        private readonly _filename: string,
    ) {
        super();
    }

    error(message: string, tag?: string): void {
        const content = this._prepareMessage(message, tag)
        fs.writeFileSync(this._filename, `\n${content}`, { flag: 'a+' });
    }

    log(message: string, tag?: string): void {
        const content = this._prepareMessage(message, tag)
        fs.writeFileSync(this._filename, `\n${content}`, { flag: 'a+' });
    }
}