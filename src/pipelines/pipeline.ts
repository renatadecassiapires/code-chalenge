export default interface Pipeline {
    execute(): Promise<void>;
}