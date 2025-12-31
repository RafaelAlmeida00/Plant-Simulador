// src/adapters/database/DatabaseFactory.ts

import { IDatabase } from './IDatabase';
import { DatabaseConfigFactory, IDatabaseConfig } from './DatabaseConfig';
import { SQLiteDatabase } from './SQLiteDatabase';
import { PostgresDatabase } from './PostgresDatabase';

export class DatabaseFactory {
    private static instance: IDatabase | null = null;

    public static async getDatabase(): Promise<IDatabase> {
        if (this.instance && this.instance.isConnected()) {
            return this.instance;
        }

        const config = DatabaseConfigFactory.getConfig();
        this.instance = this.createDatabase(config);
        await this.instance.connect();

        return this.instance;
    }

    private static createDatabase(config: IDatabaseConfig): IDatabase {
        switch (config.type) {
            case 'sqlite':
                return new SQLiteDatabase(config);

            case 'postgres':
            case 'aws':
            case 'gcp':
            case 'local':
                return new PostgresDatabase(config);

            default:
                throw new Error(`Unsupported database type: ${config.type}`);
        }
    }

    public static async disconnect(): Promise<void> {
        if (this.instance) {
            await this.instance.disconnect();
            this.instance = null;
        }
    }

    public static reset(): void {
        this.instance = null;
        DatabaseConfigFactory.reset();
    }
}
