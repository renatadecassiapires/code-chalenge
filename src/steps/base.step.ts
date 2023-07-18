import Job from "../pipelines/job";
import StepInterface from "./step.interface";

export default abstract class BaseStep implements StepInterface {
    protected _next?: StepInterface;

    setNext(next: StepInterface): StepInterface {
        this._next = next;
        return next;
    }

    async run(options: Job): Promise<void> {
        if (this._next) return this._next.run(options);
    }
}