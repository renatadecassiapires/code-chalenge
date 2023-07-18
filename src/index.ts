import { StepId } from "./steps/step-id.type";
import JobResumeOptions from "./types/resume-options.type";
import { program, Argument, Option } from "commander";
import dotenv = require('dotenv');
import path = require("path");
import ProcessOrders from "./pipelines/process-orders.pipeline";
import { LoggerType } from "./utils/logger/logger.type";
import { LoggerOptions } from "./utils/logger/logger-options.type";
import { dateToString } from "./utils/date-to-string";

async function bootstrap() {
    dotenv.config({
        path: path.join(process.cwd(), "environment", ".env")
    });

    program
        .name('index.js')
        .description('CLI solve code challenge from Indicium Tech')
        .version('0.0.1');
    program
        .command('process-orders')
        .description('Merge different orders datasources and export unified orders list in JSON format')
        .addArgument(new Argument('<date>', 'Date to consider the datasources. Format YYYY-MM-DD.').argRequired())
        .addOption(new Option('-s, --start <step>', 'start pipeline from a specific step').choices(['postgres_to_local', 'csv_to_local', 'local_to_bi', 'export']).default('postgres_to_local'))
        .addOption(new Option('-l, --logger <type>', 'logger type').choices([LoggerType.NONE, LoggerType.CONSOLE, LoggerType.FILE]).default(LoggerType.CONSOLE))
        .addOption(new Option('-o, --output <file>', `logger output file. Required when --logger=${LoggerType.FILE}.`))
        .addOption(new Option('-r, --result <file>', `path for result file. (default: "orders_<date>.json")`))
        .action((dateStr, options) => {
            const regex = /\d{4}-\d{2}-\d{2}/g;
            if (!regex.test(dateStr)) {
                console.error(`<date> must be YYYY-MM-DD. Use \"process-order -h\" to see command documentation.`);
                return;
            }
            const date = new Date(dateStr);
            if (!(date instanceof Date && !isNaN(date.getTime()))) {
                console.error(`Invalid <date>. Use \"process-order -h\" to see command documentation.`);
                return;
            }
            const loggerType: LoggerType = options.logger;
            const loggerOutputFile = options.output;
            if (loggerType === LoggerType.FILE && !loggerOutputFile) {
                console.error('Logger output file is required. See --output <file> option.');
                return;
            }
            const loggerOptions: LoggerOptions = {
                type: loggerType,
                outputFile: loggerOutputFile,
            };
            const resultFilename = options.result || `orders_${dateToString(date)}.json`;
            let step: StepId;
            switch (options.start) {
                case "postgres_to_local": step = StepId.POSTGRES_TO_LOCAL; break;
                case "csv_to_local": step = StepId.CSV_TO_LOCAL; break;
                case "local_to_bi": step = StepId.LOCAL_TO_BI; break;
                case "export": step = StepId.EXPORT_ORDERS; break;
                default: step = StepId.POSTGRES_TO_LOCAL;
            }
            const resumeOptions: JobResumeOptions = { step };
            const pipeline = new ProcessOrders(date, resultFilename, loggerOptions, resumeOptions);
            pipeline.execute();
        });
    program.parse();
}
bootstrap();
