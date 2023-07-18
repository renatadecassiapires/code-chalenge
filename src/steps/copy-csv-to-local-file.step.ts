import BaseStep from "./base.step";
import fs = require("fs");
import path = require("path");
import LineByLine = require("n-readlines");
import Job from "../pipelines/job";
import CopyCsvToLocalFileConfig from "../types/copy-csv-to-local-file-config.type";
import { dateToString } from "../utils/date-to-string";
import SourceCsvFileNotFoundException from "../exception/source-csv-file-not-found.exception";
import SourceCsvFileIsEmptyException from "../exception/source-csv-file-is-empty.exception";

export default class CopyCsvToLocalFile extends BaseStep {
    constructor(
        private readonly _config: CopyCsvToLocalFileConfig,
    ) {
        super();
    }

    async run(job: Job): Promise<void> {
        job.logger.log("Copying CSV source file to local disk...");
        if (!fs.existsSync(this._config.inputFilename)) {
            throw new SourceCsvFileNotFoundException(`File ${this._config.inputFilename} not found`);
        }
        const fileReader = new LineByLine(this._config.inputFilename);
        const keys = this._getKeysFromHeader(fileReader);
        const outputFilename = path.join(this._config.localFolder, dateToString(job.date), this._config.outputFilename);
        const count = this._copyRows(fileReader, keys, outputFilename);
        job.logger.log(`${count} rows copied!`);
        return await super.run(job);
    }

    private _getKeysFromHeader(fileReader: LineByLine): string[] {
        fileReader.reset();
        const headerRow = fileReader.next();
        if (!headerRow) {
            fileReader.close();
            throw new SourceCsvFileIsEmptyException(`${this._config.inputFilename} is empty`);
        }
        const keys = headerRow.toString('utf-8').split(',');
        return keys;
    }
    
    private _copyRows(fileReader: LineByLine, keys: string[], outputFilename: string): number {
        if (fs.existsSync(outputFilename)) {
            fs.unlinkSync(outputFilename);
        }
        let rowsCount = 0;
        let row;
        while (row = fileReader.next()) {
            const obj = this._convertRowToObj(row.toString('utf-8'), keys);
            fs.writeFileSync(outputFilename, JSON.stringify(obj) + '\n', {flag: 'a+'});
            rowsCount++;
        }
        return rowsCount;
    }

    private _convertRowToObj(line: string, keys: string[]): any {
        const obj: Record<string, any> = {};
        const values = line.split(',');
        keys.forEach((key, index) => {
            obj[key] = values[index];
        });
        return obj;
    }
}