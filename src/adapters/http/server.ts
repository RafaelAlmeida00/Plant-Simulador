// src/adapters/http/server.ts

import express, { Request, Response } from 'express';
import { createServer, Server as HttpServer } from 'http';
import AppRouter from './router/router';
import { socketServer } from './websocket/SocketServer';
import { DatabaseFactory } from '../database/DatabaseFactory';
import HealthController from './controllers/HealthController';

export class Server {
    private app: express.Application;
    private httpServer: HttpServer;
    private port: number | string;
    private simulatorClock: any = null;

    constructor() {
        this.app = express();
        this.httpServer = createServer(this.app);
        this.port = process.env.PORT || 3000;
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeWebSocket();
    }

    private initializeMiddlewares() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    private initializeRoutes() {
        this.app.use(AppRouter);
    }

    private initializeWebSocket() {
        socketServer.initialize(this.httpServer);
        console.log('[SERVER] WebSocket initialized');
    }

    public setSimulatorClock(clock: any): void {
        this.simulatorClock = clock;
        HealthController.setSimulatorClock(clock);
    }

    public getSocketServer() {
        return socketServer;
    }

    public getHttpServer(): HttpServer {
        return this.httpServer;
    }

    public async listen(): Promise<void> {
        // Inicializa o banco de dados
        try {
            await DatabaseFactory.getDatabase();
            console.log('[SERVER] Database connected');
        } catch (error) {
            console.error('[SERVER] Database connection failed:', error);
        }

        return new Promise((resolve) => {
            this.httpServer.listen(this.port, () => {
                console.log(`[SERVER] HTTP Server running on port ${this.port}`);
                console.log(`[SERVER] WebSocket available at ws://localhost:${this.port}`);
                console.log(`[SERVER] API available at http://localhost:${this.port}/api`);
                resolve();
            });
        });
    }

    public async close(): Promise<void> {
        socketServer.close();
        await DatabaseFactory.disconnect();
        
        return new Promise((resolve) => {
            this.httpServer.close(() => {
                console.log('[SERVER] Server closed');
                resolve();
            });
        });
    }
}
