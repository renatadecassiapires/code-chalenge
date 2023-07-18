import BaseStep from "./base.step";
import { Client } from 'pg';
import Cursor from 'pg-cursor';
import fs = require('fs');
import path = require('path');
import Job from "../pipelines/job";
import CopyPostgresToLocalFileConfig from "../types/copy-postgres-to-local-file-config.type";
import { dateToString } from "../utils/date-to-string";
import CouldNotConnectToSourceDatabaseException from "../exception/could-not-connect-to-source-database.exception";
import EmptySourceDatabaseException from "../exception/empty-source-database.exception";

export default class CopyPostgresToLocalFile extends BaseStep {
    constructor(
        private readonly _config: CopyPostgresToLocalFileConfig,
    ) {
        super();
    }

    async run(job: Job): Promise<void> {
        job.logger.log("Copying Postgres source tables to local disk...");
        const client = await this._connectToDatabase();
        const tableNames = await this._listTableNames(client);
        if (!tableNames.length) {
            throw new EmptySourceDatabaseException("No table found in source database");
        }
        await this._copyTablesToLocalDisk(job, client, tableNames);
        await this._disconnectFromDatabase(client);
        return await super.run(job);
    }

    private async _connectToDatabase(): Promise<Client> {
        try {
            const client = new Client({
                host: this._config.postgresHost,
                port: this._config.postgresPort,
                database: this._config.postgresDatabase,
                user: this._config.postgresUser,
                password: this._config.postgresPassword,
            });
            await client.connect();
            return client;
        } catch (error) {
            // console.error(error);
            throw new CouldNotConnectToSourceDatabaseException("Could not connect to Postgres database");
        }
    }

    private async _disconnectFromDatabase(client: Client): Promise<void> {
        await client.end();
    }

    private async _listTableNames(client: Client): Promise<string[]> {
        const result = await client.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != $1 AND schemaname != $2 ORDER BY tablename", ['pg_catalog', 'information_schema']);
        return result.rows.map((row) => row['tablename']);
    }

    private async _copyTablesToLocalDisk(job: Job, client: Client, tableNames: string[]): Promise<void> {
        const destinationFolder = path.join(this._config.localFolder, dateToString(job.date));
        if (!fs.existsSync(destinationFolder)) {
            fs.mkdirSync(destinationFolder);
        }
        for (const tableName of tableNames) {
            job.logger.log(`Copying table ${tableName}...`);
            const count = await this._copyTableToFile(client, tableName, destinationFolder);
            job.logger.log(`${count} rows copied!`);
        }
    }

    private async _copyTableToFile(client: Client, tableName: string, destinationFolder: string): Promise<number> {
        const fileName = path.join(destinationFolder, `${tableName}.json`);
        if (fs.existsSync(fileName)) {
            fs.unlinkSync(fileName);
        }
        let copiedRowsCount = 0;
        const cursor = client.query(new Cursor(`SELECT * FROM ${tableName}`));
        while(true) {
            const rows = await cursor.read(100);
            if (rows.length === 0) break;
            for (const row of rows) {
                const rowStr = JSON.stringify(row) + '\n';
                fs.writeFileSync(fileName, rowStr, { flag: 'a+'});
                copiedRowsCount++;
            }
        }
        await cursor.close();
        return copiedRowsCount;
    }
}