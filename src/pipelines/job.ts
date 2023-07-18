import JobResumeOptions from "../types/resume-options.type";
import Logger from "../utils/logger/logger";

export default interface Job {
    readonly date: Date;
    readonly resultFilename: string;
    readonly resumeOptions?: JobResumeOptions;
    readonly logger: Logger;
}