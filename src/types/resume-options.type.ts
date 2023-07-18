import { StepId } from "../steps/step-id.type";

export default interface JobResumeOptions {
    readonly step: StepId;
    readonly sourceTableName?: string; 
}