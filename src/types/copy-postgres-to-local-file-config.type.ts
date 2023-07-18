export default interface CopyPostgresToLocalFileConfig {
    readonly postgresHost: string;
    readonly postgresPort: number;
    readonly postgresUser: string;
    readonly postgresPassword: string;
    readonly postgresDatabase: string;
    readonly localFolder: string;
}