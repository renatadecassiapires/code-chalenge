export default interface ExportOrdersWithDetailsConfig {
    readonly biHost: string;
    readonly biPort: number;
    readonly biUser?: string;
    readonly biPassword?: string;
    readonly biDatabase: string;
    readonly resultFilename: string
} 