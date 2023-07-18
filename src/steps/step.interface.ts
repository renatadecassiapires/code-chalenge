import Job from "../pipelines/job";

export default interface StepInterface {
    setNext(next: StepInterface): StepInterface;
    run(job: Job): Promise<void>;
}