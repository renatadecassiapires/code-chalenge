export interface PipelineConfig {
    readonly postgresHost: string;
    readonly postgresPort: number;
    readonly postgresUser: string;
    readonly postgresPassword: string;
    readonly postgresDatabase: string;

    readonly biHost: string;
    readonly biPort: number;
    readonly biUser?: string;
    readonly biPassword?: string;
    readonly biDatabase: string;

    readonly sourceDataFolder: string;
    readonly localDataFolder: string;
}