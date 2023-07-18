export default interface CopyLocalFilesToBiConfig {
    readonly biHost: string;
    readonly biPort: number;
    readonly biUser?: string;
    readonly biPassword?: string;
    readonly biDatabase: string;
    readonly localFolder: string;
}