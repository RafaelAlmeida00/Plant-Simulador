// src/adapters/http/websocket/SocketServer.ts

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { IBuffer } from '../../../domain/models/Buffer';
import { IStopLine } from '../../../domain/models/StopLine';
import { PlantSnapshot } from '../../../domain/services/PlantQueryService';

export interface SocketEventData {
    type: string;
    data: any;
    timestamp: number;
}

export class SocketServer {
    private io: SocketIOServer | null = null;
    private static instance: SocketServer | null = null;
    private readonly allowedChannels = new Set(['events', 'stops', 'buffers', 'plantstate', 'health']);

    private constructor() {}

    public static getInstance(): SocketServer {
        if (!SocketServer.instance) {
            SocketServer.instance = new SocketServer();
        }
        return SocketServer.instance;
    }

    public initialize(httpServer: HttpServer): SocketIOServer {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            },
            path: '/socket.io'
        });

        this.setupConnectionHandlers();
        return this.io;
    }

    private setupConnectionHandlers(): void {
        if (!this.io) return;

        this.io.on('connection', (socket: Socket) => {
            console.log(`[SOCKET] Client connected: ${socket.id}`);

            // Permitir que clientes se inscrevam em canais específicos
            socket.on('subscribe', (channel: string) => {
                if (!this.allowedChannels.has(channel)) {
                    return;
                }
                socket.join(channel);
                console.log(`[SOCKET] Client ${socket.id} subscribed to ${channel}`);
            });

            socket.on('unsubscribe', (channel: string) => {
                if (!this.allowedChannels.has(channel)) {
                    return;
                }
                socket.leave(channel);
                console.log(`[SOCKET] Client ${socket.id} unsubscribed from ${channel}`);
            });

            socket.on('disconnect', () => {
                console.log(`[SOCKET] Client disconnected: ${socket.id}`);
            });
        });
    }

    public getIO(): SocketIOServer | null {
        return this.io;
    }

    // Emite evento de movimentação de carro
    public emitCarEvent(event: {
        carId: string;
        eventType: 'CREATED' | 'MOVED' | 'COMPLETED' | 'REWORK_IN' | 'REWORK_OUT' | 'BUFFER_IN' | 'BUFFER_OUT';
        shop: string;
        line: string;
        station: string;
        timestamp: number;
        data?: any;
    }): void {
        if (!this.io) return;

        const payload: SocketEventData = {
            type: 'CAR_EVENT',
            data: event,
            timestamp: Date.now()
        };

        // room-based (subscribe/unsubscribe passa a funcionar)
        this.io.to('events').emit('events', payload);
        // alias legado
        this.io.to('events').emit('car_event', payload);
    }

    // Emite estado das paradas
    public emitStopEvent(stop: IStopLine, action: 'STARTED' | 'ENDED' | 'UPDATED'): void {
        if (!this.io) return;

        const payload: SocketEventData = {
            type: 'STOP_EVENT',
            data: {
                action,
                stop: {
                    id: stop.id,
                    shop: stop.shop,
                    line: stop.line,
                    station: stop.station,
                    reason: stop.reason,
                    severity: stop.severity,
                    type: stop.type,
                    category: stop.category,
                    startTime: stop.startTime,
                    endTime: stop.endTime,
                    status: stop.status,
                    durationMs: stop.durationMs
                }
            },
            timestamp: Date.now()
        };

        this.io.to('stops').emit('stops', payload);
        // alias legado
        this.io.to('stops').emit('stop_event', payload);
    }

    // Emite estado de todos os stops
    public emitAllStops(stops: Map<string, IStopLine>): void {
        if (!this.io) return;

        const stopsArray: any[] = [];
        for (const [id, stop] of stops) {
            stopsArray.push({
                id: stop.id,
                shop: stop.shop,
                line: stop.line,
                station: stop.station,
                reason: stop.reason,
                severity: stop.severity,
                type: stop.type,
                status: stop.status,
                startTime: stop.startTime,
                endTime: stop.endTime
            });
        }

        const payload: SocketEventData = {
            type: 'STOPS_STATE',
            data: stopsArray,
            timestamp: Date.now()
        };

        this.io.to('stops').emit('stops', payload);
    }

    // Emite estado do buffer
    public emitBufferEvent(buffer: IBuffer, action: 'UPDATED'): void {
        if (!this.io) return;

        const carIds = buffer.cars.map(c => c.id);
        
        const payload: SocketEventData = {
            type: 'BUFFER_EVENT',
            data: {
                action,
                buffer: {
                    id: buffer.id,
                    from: buffer.from,
                    to: buffer.to,
                    capacity: buffer.capacity,
                    currentCount: buffer.currentCount,
                    status: buffer.status,
                    type: buffer.type,
                    carIds
                }
            },
            timestamp: Date.now()
        };

        this.io.to('buffers').emit('buffers', payload);
        // alias legado
        this.io.to('buffers').emit('buffer_event', payload);
    }

    // Emite estado de todos os buffers
    public emitAllBuffers(buffers: Map<string, IBuffer>): void {
        if (!this.io) return;

        const buffersArray: any[] = [];
        for (const [id, buffer] of buffers) {
            buffersArray.push({
                id: buffer.id,
                from: buffer.from,
                to: buffer.to,
                capacity: buffer.capacity,
                currentCount: buffer.currentCount,
                status: buffer.status,
                type: buffer.type,
                carIds: buffer.cars.map(c => c.id)
            });
        }

        const payload: SocketEventData = {
            type: 'BUFFERS_STATE',
            data: buffersArray,
            timestamp: Date.now()
        };

        this.io.to('buffers').emit('buffers', payload);
    }

    // Emite estado completo da planta
    public emitPlantState(snapshot: PlantSnapshot): void {
        if (!this.io) return;

        const payload: SocketEventData = {
            type: 'PLANT_STATE',
            data: snapshot,
            timestamp: Date.now()
        };

        this.io.to('plantstate').emit('plantstate', payload);
        // alias legado
        this.io.to('plantstate').emit('plant_state', payload);
    }

    // Emite health check
    public emitHealth(status: {
        serverStatus: 'healthy' | 'unhealthy';
        simulatorStatus: 'running' | 'stopped' | 'paused';
        timestamp: number;
        simulatorTimestamp: number;
        simulatorTimeString: string;
        uptime: number;
    }): void {
        if (!this.io) return;

        const payload: SocketEventData = {
            type: 'HEALTH',
            data: status,
            timestamp: Date.now()
        };

        this.io.to('health').emit('health', payload);
    }

    public close(): void {
        if (this.io) {
            this.io.close();
            this.io = null;
        }
    }
}

export const socketServer = SocketServer.getInstance();
