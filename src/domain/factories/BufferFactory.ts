import { FlowPlant } from "../config/flowPlant";
import { Buffer, IBuffer } from "../models/Buffer";
import { ICar } from "../models/Car";

export class BufferFactory {
    private buffers: Map<string, IBuffer> = new Map();
    private static readonly flowPlantShopsEntries: [string, any][] = Object.entries(FlowPlant.shops);

    constructor() {
        this.createAllBuffers();
    }

    private createAllBuffers(): void {
        for (const [shopName, shopConfig] of BufferFactory.flowPlantShopsEntries) {
            const linesEntries = Object.entries(shopConfig.lines);
            for (let i = 0; i < linesEntries.length; i++) {
                const [lineName, lineConfig] = linesEntries[i] as [string, any];
                if (lineConfig.buffers) {
                    const buffersLen = lineConfig.buffers.length;
                    for (let j = 0; j < buffersLen; j++) {
                        const bufferConfig = lineConfig.buffers[j];
                        const bufferId = `${shopName}-${lineName}-to-${bufferConfig.to.shop}-${bufferConfig.to.line}`;
                        const buffer = new Buffer({
                            id: bufferId,
                            betweenShopOrLine: shopName === bufferConfig.to.shop ? "line" : "shop",
                            from: `${shopName}-${lineName}`,
                            to: `${bufferConfig.to.shop}-${bufferConfig.to.line}`,
                            capacity: bufferConfig.capacity,
                            currentCount: 0,
                            cars: [],
                            type: "BUFFER",
                            status: "EMPTY"
                        });
                        this.buffers.set(bufferId, buffer);
                    }
                }
            }

            if (shopConfig.reworkBuffer) {
                const reworkBufferId = `${shopName}-REWORK`;
                const reworkBuffer = new Buffer({
                    id: reworkBufferId,
                    betweenShopOrLine: "shop",
                    from: shopName,
                    to: shopName,
                    capacity: shopConfig.reworkBuffer,
                    currentCount: 0,
                    cars: [],
                    type: "REWORK_BUFFER",
                    status: "EMPTY"
                });
                this.buffers.set(reworkBufferId, reworkBuffer);
            }
        }
    }

    public getBuffersMap(): Map<string, IBuffer> {
        return this.buffers;
    }

    public getAllBuffers(): IBuffer[] {
        return Array.from(this.buffers.values());
    }

    public getAllBuffersByShop(shopName: string): IBuffer[] {
        const result: IBuffer[] = [];
        for (const buffer of this.buffers.values()) {
            if (buffer.from.startsWith(shopName) || buffer.to.startsWith(shopName)) {
                result.push(buffer);
            }
        }
        return result;
    }

    public getBuffer(bufferId: string): IBuffer | undefined {
        return this.buffers.get(bufferId);
    }

    public getAllCarsByBuffer(bufferId: string): ICar[] {
        const buffer = this.buffers.get(bufferId);
        return buffer ? buffer.cars : [];
    }

    public getCarByBuffer(bufferId: string, carId: string): ICar | undefined {
        const buffer = this.buffers.get(bufferId);
        return buffer?.cars.find(c => c.id === carId);
    }

    public addCarToBuffer(bufferId: string, car: ICar): boolean {
        const buffer = this.buffers.get(bufferId);
        if (!buffer) return false;
        if (buffer.currentCount >= buffer.capacity) return false;

        buffer.cars.push(car);
        buffer.currentCount++;
        this.updateBufferStatus(buffer);
        return true;
    }

    public removeCarFromBuffer(bufferId: string, carId: string): ICar | null {
        const buffer = this.buffers.get(bufferId);
        if (!buffer) return null;

        const index = buffer.cars.findIndex(c => c.id === carId);
        if (index === -1) return null;

        const [car] = buffer.cars.splice(index, 1);
        buffer.currentCount--;
        this.updateBufferStatus(buffer);
        return car;
    }

    public removeFirstCarFromBuffer(bufferId: string): ICar | null {
        const buffer = this.buffers.get(bufferId);
        if (!buffer || buffer.cars.length === 0) return null;

        const car = buffer.cars.shift()!;
        buffer.currentCount--;
        this.updateBufferStatus(buffer);
        return car;
    }

    private updateBufferStatus(buffer: IBuffer): void {
        if (buffer.currentCount === 0) {
            buffer.status = "EMPTY";
        } else if (buffer.currentCount >= buffer.capacity) {
            buffer.status = "FULL";
        } else {
            buffer.status = "AVAILABLE";
        }
    }
}
