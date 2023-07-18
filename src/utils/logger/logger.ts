export default abstract class Logger {
    abstract log(message: string, tag?: string): void;
    abstract error(message: string, tag?: string): void;

    protected _prepareMessage(message: string, tag?: string): string {
        const now = new Date();
        let content = `[${now.toISOString()}]`;
        if (tag) {
            content += ` [${tag}]`;
        }
        content += ` ${message}`;
        return content;
    }
}