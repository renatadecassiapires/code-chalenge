import path from "path";
import Pipeline from "./pipeline";
import { PipelineConfig } from "../types/pipeline-config.type";
import JobResumeOptions from "../types/resume-options.type";
import { dateToString } from "../utils/date-to-string";
import LoggerFactory from "../utils/logger/logger.factory";
import { LoggerOptions } from "../utils/logger/logger-options.type";
import Job from "./job";
import CopyPostgresToLocalFile from "../steps/copy-postgres-to-local-file.step";
import CopyCsvToLocalFile from "../steps/copy-csv-to-local-file.step";
import ExportOrdersWithDetails from "../steps/export-orders-with-details.step";
import { StepId } from "../steps/step-id.type";
import CopyLocalFilesToBi from "../steps/copy-local-files-to-bi.step";

export default class ProcessOrders implements Pipeline {

    private readonly _config: PipelineConfig;
    private readonly _job: Job;

    constructor(
        date: Date,
        resultFilename: string,
        loggerOptions: LoggerOptions,
        resumeOptions?: JobResumeOptions,
    ) {
        this._config = {
            postgresHost: process.env.POSTGRES_HOST || "localhost",
            postgresPort: parseInt(process.env.POSTGRES_PORT || "5432"),
            postgresUser: process.env.POSTGRES_USER || "postgres",
            postgresPassword: process.env.POSTGRES_PASSWORD || "postgres",
            postgresDatabase: process.env.POSTGRES_DATABASE || "code-challenge",
    
            biHost: process.env.BI_HOST || "localhost",
            biPort: parseInt(process.env.BI_PORT || "27017"),
            biUser: process.env.BI_USER || undefined,
            biPassword: process.env.BI_PASSWORD || undefined,
            biDatabase: process.env.BI_DATABASE || "code-challenge",
    
            sourceDataFolder: process.env.SOURCE_DATA_FOLDER || path.join(process.cwd(), "data"),
            localDataFolder: process.env.LOCAL_DATA_FOLDER || path.join(process.cwd(), "data"),
        };
        this._job = { 
            date,
            resultFilename,
            resumeOptions,
            logger: LoggerFactory.createInstance(loggerOptions),
        };
    }

    async execute(): Promise<void> {
        try {
            this._job.logger.log(`--- Pipeline for ${dateToString(this._job.date)} started ---`);
            const step1 = new CopyPostgresToLocalFile({
                postgresHost: this._config.postgresHost,
                postgresPort: this._config.postgresPort,
                postgresUser: this._config.postgresUser,
                postgresPassword: this._config.postgresPassword,
                postgresDatabase: this._config.postgresDatabase,
                localFolder: this._config.localDataFolder,
            });
            const step2 = new CopyCsvToLocalFile({
                inputFilename: path.join(this._config.sourceDataFolder, "order_details.csv"),
                localFolder: this._config.localDataFolder,
                outputFilename: "order_details.json",
            });
            const step3 = new CopyLocalFilesToBi({
                biHost: this._config.biHost,
                biPort: this._config.biPort,
                biUser: this._config.biUser,
                biPassword: this._config.biPassword,
                biDatabase: this._config.biDatabase,
                localFolder: this._config.localDataFolder,
            });
            const step4 = new ExportOrdersWithDetails({
                biHost: this._config.biHost,
                biPort: this._config.biPort,
                biUser: this._config.biUser,
                biPassword: this._config.biPassword,
                biDatabase: this._config.biDatabase,
                resultFilename: this._job.resultFilename,
            });
            step1.setNext(step2);
            step2.setNext(step3);
            step3.setNext(step4);

            let result;
            switch (this._job.resumeOptions?.step) {
                case StepId.POSTGRES_TO_LOCAL:
                    result = await step1.run(this._job);
                    break;
                case StepId.CSV_TO_LOCAL:
                    result = await step2.run(this._job);
                    break;
                case StepId.LOCAL_TO_BI: 
                    result = await step3.run(this._job);
                    break;
                case StepId.EXPORT_ORDERS:
                    result = await step4.run(this._job);
                    break;
                default: result = await step1.run(this._job);
            }
            this._job.logger.log(`--- Pipeline for ${dateToString(this._job.date)} finished ---`);
        } catch (error: any) {
            console.error(error);
            this._job.logger.error(error.toString());
            throw error;
        }
    }
}