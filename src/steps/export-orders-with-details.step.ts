import Job from "../pipelines/job";
import BaseStep from "./base.step";
import { Collection, MongoClient } from "mongodb";
import fs = require("fs");
import ExportOrdersWithDetailsConfig from "../types/export-orders-with-details-config";
import { dateToString } from "../utils/date-to-string";
import CouldNotConnectToBiDatabaseException from "../exception/could-not-connect-to-bi-database.exception";
import CouldNotPrepareCollectionInBiDatabaseException from "../exception/could-not-prepare-collection-in-bi-database.exception";

export default class ExportOrdersWithDetails extends BaseStep {
    constructor(
        private readonly _config: ExportOrdersWithDetailsConfig,
    ) {
        super();
    }

    async run(job: Job): Promise<void> {
        job.logger.log("Exporting orders data...");
        const connection = await this._connectToDatabase();
        const collectionName = dateToString(job.date);
        const collection = await this._prepareCollection(connection, collectionName);
        const ordersCount = await this._exportOrders(collection);
        job.logger.log(`Exported ${ordersCount} orders to ${job.resultFilename}!`);
        await this._disconnectFromDatabase(connection);
        return await super.run(job);
    }
    
    private async _connectToDatabase(): Promise<MongoClient> {
        try {
            let connectionUrl = "mongodb://";
            if (this._config.biUser) {
                connectionUrl += this._config.biUser;
                if (this._config.biPassword) {
                    connectionUrl += `:${this._config.biPassword}`;
                }
                connectionUrl += "@";
            }
            connectionUrl += `${this._config.biHost}:${this._config.biPort}/${this._config.biDatabase}`;
            const connection = await MongoClient.connect(connectionUrl);
            return connection;
        } catch (error) {
            // console.error(error);
            throw new CouldNotConnectToBiDatabaseException("Unable to connect to BI database");
        }
    }

    private async _prepareCollection(connection: MongoClient, collectionName: string): Promise<Collection> {
        try {
            const db = connection.db();
            const collection = db.collection(collectionName);
            return collection;
        } catch (error) {
            // console.error(error);
            await this._disconnectFromDatabase(connection);
            throw new CouldNotPrepareCollectionInBiDatabaseException(`Could not prepare collection ${collectionName}`);
        }
    }

    private async _disconnectFromDatabase(connection: MongoClient): Promise<void> {
        await connection.close();
    }

    private async _exportOrders(collection: Collection): Promise<number> {
        if (fs.existsSync(this._config.resultFilename)) {
            fs.unlinkSync(this._config.resultFilename);
        }
        fs.writeFileSync(this._config.resultFilename, "[\n", { flag: "a+"});
        let skip = 0;
        const limit = 100;
        let totalRows = 0;
        do {
            const orders = collection.find({}, { skip, limit });
            if (!(await orders.hasNext())) break;
            do {
                const order = await orders.next();
                if (!order) break;
                if (totalRows > 0) {
                    fs.writeFileSync(this._config.resultFilename, ",\n", { flag: "a+"});
                }
                fs.writeFileSync(this._config.resultFilename, JSON.stringify(order), { flag: "a+"});
                totalRows++;
            } while (true);
            skip += limit;
        } while(true);
        fs.writeFileSync(this._config.resultFilename, "\n]", { flag: "a+"});
        return totalRows;
    }
}