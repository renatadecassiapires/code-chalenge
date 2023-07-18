import Job from "../pipelines/job";
import BaseStep from "./base.step";
import { Collection, MongoClient } from "mongodb";
import LineByLine = require("n-readlines");
import path = require('path');
import fs = require('fs');
import CopyLocalFilesToBiConfig from "../types/copy-local-files-to-bi-config.type";
import { dateToString } from "../utils/date-to-string";
import CouldNotConnectToBiDatabaseException from "../exception/could-not-connect-to-bi-database.exception";
import CouldNotCreateCollectionInBiDatabaseException from "../exception/could-not-create-collection-in-bi-database.exception";
import LocalOrdersFileNotFoundException from "../exception/local-orders-file-not-found.exception";
import LocalProductsFileNotFoundException from "../exception/local-products-file-not-found.exception";
import ProductNotFoundInLocalFileException from "../exception/product-not-found-in-local-file.exception";

export default class CopyLocalFilesToBi extends BaseStep {
    constructor(
        private readonly _config: CopyLocalFilesToBiConfig,
    ) {
        super();
    }

    async run(job: Job): Promise<void> {
        job.logger.log("Copying orders data to BI Database...");
        const connection = await this._connectToDatabase(); 
        const collectionName = dateToString(job.date);
        const collection = await this._prepareCollection(connection, collectionName);
        const ordersCount = await this._copyLocalFilesToBi(collection);
        job.logger.log(`${ordersCount} orders copied!`)
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
            await collection.deleteMany({});
            return collection;
        } catch (error) {
            // console.error(error);
            await this._disconnectFromDatabase(connection);
            throw new CouldNotCreateCollectionInBiDatabaseException(`Could not prepare collection ${collectionName}`);
        }
    }

    private async _disconnectFromDatabase(connection: MongoClient): Promise<void> {
        await connection.close();
    }

    private async _copyLocalFilesToBi(collection: Collection): Promise<number> {
        const ordersFilename = path.join(this._config.localFolder, collection.collectionName, "orders.json");
        if (!fs.existsSync(ordersFilename)) {
            throw new LocalOrdersFileNotFoundException(`${ordersFilename} not found`);
        }
        const fileReader = new LineByLine(ordersFilename);
        let rowsCount = 0;
        let row;
        while (row = fileReader.next()) {
            const order = JSON.parse(row.toString("utf-8"));
            order.details = await this._listOrderDetailsByOrderId(collection.collectionName, order.order_id);
            await collection.insertOne(order);
            rowsCount++;
        }
        return rowsCount;
    }

    private async _listOrderDetailsByOrderId(collectionName: string, orderId: number): Promise<any[]> {
        const result: any[] = [];
        const orderDetailsFilename = path.join(this._config.localFolder, collectionName, "order_details.json");
        if (!fs.existsSync(orderDetailsFilename)) {
            return result;
        }
        const fileReader = new LineByLine(orderDetailsFilename);
        let line;
        while (line = fileReader.next()) {
            const orderDetails = JSON.parse(line.toString('utf-8'));
            if (orderDetails.order_id != orderId) continue;
            const product = await this._findProductById(collectionName, orderDetails.product_id);
            if (!product) {
                throw new ProductNotFoundInLocalFileException(`Product ${orderDetails.product_id} not found`);
            }
            orderDetails.product = product;
            result.push(orderDetails);
        }
        return result;
    }

    private async _findProductById(collectionName: string, productId: number): Promise<any> {
        const productsFilename = path.join(this._config.localFolder, collectionName, "products.json");
        if (!fs.existsSync(productsFilename)) {
            throw new LocalProductsFileNotFoundException(`${productsFilename} not found`);
        }
        const fileReader = new LineByLine(productsFilename);
        let line;
        while (line = fileReader.next()) {
            const product = JSON.parse(line.toString());
            if (product.product_id == productId) {
                return product;
            }
        }
        return null;
    }
}