import { IShop } from "../domain/models/Shop";
import { ILine, Line } from "../domain/models/Line";
import { IStation } from "../domain/models/Station";
import { IBuffer } from "../domain/models/Buffer";
import { IStopLine, StopLine } from "../domain/models/StopLine";
import { ICar, ICarTrace } from "../domain/models/Car";
import { FlowPlant } from "../domain/config/flowPlant";
import { CarFactory } from "../domain/factories/carFactory";
import { TickEvent, SimulationCallbacks } from "../utils/shared";

interface FlowContext {
    shops: Map<string, IShop>;
    buffers: Map<string, IBuffer>;
    stops: Map<string, IStopLine>;
    event: TickEvent;
    callbacks?: SimulationCallbacks;
}

interface ShiftState {
    isActive: boolean;
    lastShiftDate: string;
}

export class SimulationFlow {
    private shops: Map<string, IShop>;
    private buffers: Map<string, IBuffer>;
    private stops: Map<string, IStopLine>;
    private event: TickEvent;
    private callbacks?: SimulationCallbacks;
    private static carFactory: CarFactory = new CarFactory();
    private static stopIdCounter: number = 10000;
    private static shiftStates: Map<string, ShiftState> = new Map();
    private static alternateReworkPull: boolean = false;
    private static readonly flowPlantShopsEntries: [string, any][] = Object.entries(FlowPlant.shops);
    private static readonly reworkTimeMs: number = (FlowPlant.Rework_Time || 60) * 60000;
    private static readonly dphu: number = FlowPlant.DPHU || 5;
    private static readonly TWO_HOURS_MS: number = 2 * 60 * 60 * 1000;

    constructor(context: FlowContext) {
        this.shops = context.shops;
        this.buffers = context.buffers;
        this.stops = context.stops;
        this.event = context.event;
        this.callbacks = context.callbacks;
    }

    public updateEvent(event: TickEvent): void {
        this.event = event;
    }

    public execute(): void {
        this.checkShiftTransitions();
        this.updateScheduledStops();
        this.createCarsAtStartStations();
        this.processAllStations();
        this.processReworkBuffers();
    }

    // Verifica transições de turno (início e fim)
    private checkShiftTransitions(): void {
        const simDate = new Date(this.event.simulatedTimestamp);
        const h = simDate.getHours();
        const m = simDate.getMinutes();
        const currentTimeStr = `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
        const currentDateStr = simDate.toDateString();

        for (const [shopName, shopConfig] of SimulationFlow.flowPlantShopsEntries) {
            const linesEntries = Object.entries((shopConfig as any).lines);
            for (let i = 0; i < linesEntries.length; i++) {
                const [lineName, lineConfig] = linesEntries[i];
                const lineKey = `${shopName}-${lineName}`;
                const shiftStart = (lineConfig as any).takt?.shiftStart || "07:00";
                const shiftEnd = (lineConfig as any).takt?.shiftEnd || "23:48";

                let state = SimulationFlow.shiftStates.get(lineKey);
                if (!state) {
                    state = { isActive: false, lastShiftDate: "" };
                    SimulationFlow.shiftStates.set(lineKey, state);
                }

                // Fim do turno - limpa paradas da linha
                if (currentTimeStr === shiftEnd && state.isActive) {
                    this.clearLineStops(shopName, lineName);
                    state.isActive = false;
                    this.log(`SHIFT_END: ${lineKey}`);
                }

                // Início do turno - recria paradas para novo dia
                if (currentTimeStr === shiftStart && state.lastShiftDate !== currentDateStr) {
                    this.regenerateLineStops(shopName, lineName, lineConfig);
                    state.isActive = true;
                    state.lastShiftDate = currentDateStr;
                    this.log(`SHIFT_START: ${lineKey}`);
                }
            }
        }
    }

    // Limpa todas as paradas de uma linha
    private clearLineStops(shopName: string, lineName: string): void {
        const keysToDelete: string[] = [];
        for (const [id, stop] of this.stops) {
            if (stop.shop === shopName && stop.line === lineName) {
                keysToDelete.push(id);
            }
        }
        for (const key of keysToDelete) {
            this.stops.delete(key);
        }
        this.log(`STOPS_CLEARED: ${shopName}/${lineName} (${keysToDelete.length} stops)`);
    }

    // Regenera paradas planejadas e aleatórias para uma linha
    private regenerateLineStops(shopName: string, lineName: string, lineConfig: any): void {
        // Gera paradas planejadas
        if (FlowPlant.plannedStops) {
            for (const stop of FlowPlant.plannedStops) {
                if (stop.affectsShops && !stop.affectsShops.includes(shopName)) continue;
                if (stop.daysOfWeek?.includes(new Date().getDay()) === false) continue;

                const [hour, minute] = stop.startTime.split(":").map(Number);
                const startTimeMs = (hour * 60 + minute) * 60 * 1000;

                const newStop = new StopLine({
                    id: ++SimulationFlow.stopIdCounter,
                    shop: shopName,
                    line: lineName,
                    station: "ALL",
                    reason: stop.name,
                    startTime: startTimeMs,
                    endTime: startTimeMs + stop.durationMn * 60 * 1000,
                    status: "PLANNED",
                    severity: "LOW",
                    type: "PLANNED",
                    category: stop.type as any,
                    durationMs: stop.durationMn * 60 * 1000
                });
                this.stops.set(newStop.id.toString(), newStop);
            }
        }

        // Gera paradas aleatórias baseadas em MTBF/MTTR
        const productionTimeMinutes = this.getProductionTimeMinutes(shopName, lineConfig);
        const mtbfMinutes = lineConfig.MTBF;
        const mttrMinutes = lineConfig.MTTR;
        const numStops = Math.floor(productionTimeMinutes / mtbfMinutes);

        if (numStops > 0) {
            const stations = lineConfig.stations || [];
            const productionTimeMs = productionTimeMinutes * 60 * 1000;

            for (let i = 0; i < numStops; i++) {
                const randomStation = stations[Math.floor(Math.random() * stations.length)];
                const startTime = Math.floor(Math.random() * productionTimeMs);
                const severity = this.randomSeverity();
                const durationMs = this.randomDurationBySeverity(severity, mttrMinutes);

                const newStop = new StopLine({
                    id: ++SimulationFlow.stopIdCounter,
                    shop: shopName,
                    line: lineName,
                    station: randomStation,
                    reason: "Random failure",
                    startTime,
                    endTime: startTime + durationMs,
                    status: "PLANNED",
                    severity,
                    type: "RANDOM_GENERATE",
                    category: "PROCESS_QUALITY_FAILURE",
                    durationMs
                });
                this.stops.set(newStop.id.toString(), newStop);
            }
        }

        this.log(`STOPS_REGENERATED: ${shopName}/${lineName}`);
    }

    private getProductionTimeMinutes(shopName: string, lineConfig: any): number {
        const [startHour, startMinute] = (lineConfig.takt?.shiftStart || "07:00").split(":").map(Number);
        const [endHour, endMinute] = (lineConfig.takt?.shiftEnd || "23:48").split(":").map(Number);

        let totalMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
        if (totalMinutes < 0) totalMinutes += 24 * 60;

        if (FlowPlant.plannedStops) {
            for (const stop of FlowPlant.plannedStops) {
                if (!stop.affectsShops || stop.affectsShops.includes(shopName)) {
                    totalMinutes -= stop.durationMn;
                }
            }
        }
        return totalMinutes;
    }

    private randomSeverity(): "LOW" | "MEDIUM" | "HIGH" {
        const rand = Math.random();
        if (rand < 0.7) return "LOW";
        if (rand < 0.95) return "MEDIUM";
        return "HIGH";
    }

    private randomDurationBySeverity(severity: "LOW" | "MEDIUM" | "HIGH", mttrMinutes: number): number {
        const ranges = { LOW: { min: 1, max: 5 }, MEDIUM: { min: 5, max: 10 }, HIGH: { min: 10, max: 60 } };
        const range = ranges[severity];
        const baseDuration = (range.min + Math.random() * (range.max - range.min)) * 60 * 1000;
        const scaleFactor = mttrMinutes / 5;
        return Math.round(baseDuration * scaleFactor);
    }

    // Atualiza status das paradas agendadas (PLANNED -> IN_PROGRESS -> COMPLETED)
    private updateScheduledStops(): void {
        const simTime = this.getSimTimeMs();

        for (const [id, stop] of this.stops) {
            if (stop.status === "PLANNED" && simTime >= stop.startTime) {
                // Verifica se alguma station afetada ainda não recebeu carro
                if (this.shouldDelayStop(stop)) {
                    stop.startTime += SimulationFlow.TWO_HOURS_MS;
                    stop.endTime += SimulationFlow.TWO_HOURS_MS;
                    continue;
                }
                stop.status = "IN_PROGRESS";
                this.applyStopToStations(stop);
                this.log(`STOP_START: ${stop.shop}/${stop.line}/${stop.station} - ${stop.reason}`);
                this.callbacks?.onStopStarted?.(
                    stop.id.toString(),
                    stop.shop,
                    stop.line,
                    stop.station,
                    stop.reason,
                    stop.category,
                    this.event.simulatedTimestamp
                );
                this.callbacks?.onStopStartedStopLine?.(stop);
            }

            if (stop.status === "IN_PROGRESS" && simTime >= stop.endTime) {
                stop.status = "COMPLETED";
                this.removeStopFromStations(stop);
                this.log(`STOP_END: ${stop.shop}/${stop.line}/${stop.station} - ${stop.reason}`);
                this.callbacks?.onStopEnded?.(
                    stop.id.toString(),
                    stop.shop,
                    stop.line,
                    stop.station,
                    stop.reason,
                    stop.durationMs || 0,
                    this.event.simulatedTimestamp
                );
                this.callbacks?.onStopEndedStopLine?.(stop);
            }
        }
    }

    // Aplica parada nas stations afetadas
    private applyStopToStations(stop: IStopLine): void {
        const stations = this.getAffectedStations(stop);
        for (const station of stations) {
            station.isStopped = true;
            station.stopReason = stop.reason;
            station.startStop = stop.startTime;
            station.finishStop = stop.endTime;
            station.stopId = stop.id.toString();
        }
    }

    // Remove parada das stations
    private removeStopFromStations(stop: IStopLine): void {
        const stations = this.getAffectedStations(stop);
        for (const station of stations) {
            if (station.stopId === stop.id.toString()) {
                station.isStopped = false;
                station.stopReason = undefined;
                station.stopId = undefined;
            }
        }
    }

    // Retorna stations afetadas por uma parada
    private getAffectedStations(stop: IStopLine): IStation[] {
        const shop = this.shops.get(stop.shop);
        if (!shop) return [];

        const line = this.getLineFromShop(shop, stop.line);
        if (!line) return [];

        if (stop.station === "ALL") {
            return line.stations;
        }

        const station = line.stations.find((s: IStation) => s.id.includes(stop.station));
        return station ? [station] : [];
    }

    // Verifica se a parada deve ser atrasada (alguma station ainda não recebeu carro)
    private shouldDelayStop(stop: IStopLine): boolean {
        const stations = this.getAffectedStations(stop);
        return stations.some(s => s.isFirstCar === true);
    }

    // Cria carros nas stations de início de produção
    private createCarsAtStartStations(): void {
        const startStations = FlowPlant.stationstartProduction;
        if (!startStations) return;

        const len = startStations.length;
        for (let i = 0; i < len; i++) {
            const config = startStations[i];
            const station = this.getStation(config.shop, config.line, config.station);
            if (!station) continue;

            if (!station.occupied && !this.isStationBlocked(station)) {
                const car = SimulationFlow.carFactory.createRandomCar(
                    this.event.simulatedTimestamp,
                    SimulationFlow.dphu
                );

                station.currentCar = car;
                station.occupied = true;
                (station as any).carEnteredAt = this.event.simulatedTimestamp;

                car.addTrace({
                    shop: station.shop,
                    line: station.line,
                    station: station.id,
                    enter: this.event.simulatedTimestamp
                });

                car.addShopLeadtime({
                    shop: station.shop,
                    enteredAt: this.event.simulatedTimestamp
                });

                this.log(`CAR_CREATED: ${car.id} at ${station.id}`);
                this.callbacks?.onCarCreated?.(
                    car.id,
                    station.shop,
                    station.line,
                    station.id,
                    this.event.simulatedTimestamp
                );
            }
        }
    }

    // Processa todas as stations (ordem reversa para evitar conflito)
    private processAllStations(): void {
        for (const [shopName, shop] of this.shops) {
            const lines = this.getLinesFromShop(shop);
            const linesLen = lines.length;
            for (let l = 0; l < linesLen; l++) {
                const line = lines[l];
                // Processa da última para primeira (evita conflito de movimentação)
                const stations = line.stations;
                for (let i = stations.length - 1; i >= 0; i--) {
                    this.processStation(stations[i], line, shop);
                }
            }
        }
        SimulationFlow.alternateReworkPull = !SimulationFlow.alternateReworkPull;
    }

    // Processa uma station individual
    private processStation(station: IStation, line: ILine, shop: IShop): void {
        if (!station.occupied) {
            this.tryPullCar(station, line, shop);
            return;
        }

        const carReady = this.isCarReadyToMove(station);
        if (carReady) {
            this.tryPushCar(station, line, shop);
        }
    }

    // Verifica se o carro completou o takt time na station
    private isCarReadyToMove(station: IStation): boolean {
        const enteredAt = (station as any).carEnteredAt as number;
        if (!enteredAt) return true;

        const elapsed = this.event.simulatedTimestamp - enteredAt;
        const taktMs = station.taktMn * 60000;
        return elapsed >= taktMs;
    }

    // Verifica se a station está bloqueada por parada não-flow (PLANNED/RANDOM)
    private isStationBlocked(station: IStation): boolean {
        if (!station.isStopped) return false;

        // Paradas de flow (NEXT_FULL/PREV_EMPTY) não bloqueiam tentativas
        const flowReasons = ["NEXT_FULL", "PREV_EMPTY", "Next Full", "Prev Empty"];
        return !flowReasons.includes(station.stopReason || "");
    }

    // Tenta puxar carro da station/buffer anterior
    private tryPullCar(station: IStation, line: ILine, shop: IShop): void {
        if (this.isStationBlocked(station)) return;

        // Primeira station da linha
        if (station.isFirstStation) {
            this.tryPullFromBuffer(station, line, shop);
            return;
        }

        // Station intermediária - puxa da anterior
        const prevStation = this.getPreviousStation(station, line);
        if (!prevStation) return;

        if (!prevStation.occupied || !this.isCarReadyToMove(prevStation)) {
            this.startFlowStop(station, "PREV_EMPTY", "Prev Empty");
            return;
        }

        this.endFlowStop(station, "PREV_EMPTY");
        this.moveCar(prevStation, station);
    }

    // Tenta puxar do buffer (normal ou rework alternadamente)
    private tryPullFromBuffer(station: IStation, line: ILine, shop: IShop): void {
        // Verifica se é station inicial de produção
        const startStations = FlowPlant.stationstartProduction;
        if (startStations) {
            const len = startStations.length;
            for (let i = 0; i < len; i++) {
                const s = startStations[i];
                if (s.shop === station.shop && s.line === station.line && station.id.includes(s.station)) {
                    return;
                }
            }
        }

        const bufferId = this.findInputBufferId(station.shop, station.line);
        const reworkBufferId = this.findReworkBufferId(station.shop);

        // Alternância entre buffer normal e rework
        if (SimulationFlow.alternateReworkPull && reworkBufferId) {
            if (this.tryPullFromReworkBuffer(station, reworkBufferId)) return;
            if (bufferId) this.tryPullFromNormalBuffer(station, bufferId);
        } else {
            if (bufferId && this.tryPullFromNormalBuffer(station, bufferId)) return;
            if (reworkBufferId) this.tryPullFromReworkBuffer(station, reworkBufferId);
        }
    }

    // Puxa do buffer normal
    private tryPullFromNormalBuffer(station: IStation, bufferId: string): boolean {
        const buffer = this.buffers.get(bufferId);
        if (!buffer || buffer.cars.length === 0) {
            this.startFlowStop(station, "PREV_EMPTY", "Buffer Empty");
            return false;
        }

        this.endFlowStop(station, "PREV_EMPTY");
        const car = buffer.cars.shift()!;
        buffer.currentCount--;
        this.updateBufferStatus(buffer);

        this.placeCarInStation(station, car);
        this.log(`BUFFER_OUT: ${car.id} from ${bufferId} to ${station.id}`);
        this.callbacks?.onBufferOut?.(
            car.id,
            bufferId,
            station.shop,
            station.line,
            station.id,
            this.event.simulatedTimestamp
        );
        return true;
    }

    // Puxa do buffer de rework (só carros que completaram Rework_Time)
    private tryPullFromReworkBuffer(station: IStation, bufferId: string): boolean {
        const buffer = this.buffers.get(bufferId);
        if (!buffer || buffer.cars.length === 0) return false;

        // Encontra carro que completou rework
        const cars = buffer.cars;
        const len = cars.length;
        let readyCarIndex = -1;
        for (let i = 0; i < len; i++) {
            const car = cars[i];
            if (car.reworkEnteredAt) {
                const elapsed = this.event.simulatedTimestamp - car.reworkEnteredAt;
                if (elapsed >= SimulationFlow.reworkTimeMs) {
                    readyCarIndex = i;
                    break;
                }
            }
        }

        if (readyCarIndex === -1) return false;

        const car = buffer.cars.splice(readyCarIndex, 1)[0];
        buffer.currentCount--;
        this.updateBufferStatus(buffer);

        // Finaliza rework no carro
        car.inRework = false;
        car.reworkCompletedAt = this.event.simulatedTimestamp;

        this.placeCarInStation(station, car);
        this.log(`REWORK_OUT: ${car.id} from ${bufferId} to ${station.id}`);
        this.callbacks?.onReworkOut?.(
            car.id,
            bufferId,
            station.shop,
            station.id,
            this.event.simulatedTimestamp
        );
        this.callbacks?.onReworkOutDetailed?.(
            car.id,
            bufferId,
            station.shop,
            station.line,
            station.id,
            this.event.simulatedTimestamp
        );
        return true;
    }

    // Coloca carro na station
    private placeCarInStation(station: IStation, car: ICar): void {
        station.currentCar = car;
        station.occupied = true;
        (station as any).carEnteredAt = this.event.simulatedTimestamp;

        // Marca que a station já recebeu pelo menos um carro
        if (station.isFirstCar) {
            station.isFirstCar = false;
        }

        car.addTrace({
            shop: station.shop,
            line: station.line,
            station: station.id,
            enter: this.event.simulatedTimestamp
        });
    }

    // Tenta enviar carro para próxima station/buffer
    private tryPushCar(station: IStation, line: ILine, shop: IShop): void {
        if (this.isStationBlocked(station)) return;

        const car = station.currentCar;
        if (!car) return;

        // Última station da linha - envia para buffer
        if (station.isLastStation) {
            this.tryPushToBuffer(station, line, shop, car);
            return;
        }

        // Station intermediária - envia para próxima
        const nextStation = this.getNextStation(station, line);
        if (!nextStation) return;

        if (nextStation.occupied || this.isStationBlocked(nextStation)) {
            this.startFlowStop(station, "NEXT_FULL", "Next Full");
            return;
        }

        this.endFlowStop(station, "NEXT_FULL");
        this.moveCar(station, nextStation);
    }

    // Envia carro para buffer
    private tryPushToBuffer(station: IStation, line: ILine, shop: IShop, car: ICar): void {
        // Verifica se é a última station de toda a planta
        const route = this.getRouteForStation(station.shop, line.line, station.id);
        if (!route) {
            this.completeCar(station, car);
            return;
        }

        // Verifica defeito e envia para rework se necessário
        if (car.hasDefect && !car.inRework) {
            this.sendToRework(station, car, shop);
            return;
        }

        // Encontra buffer de destino
        const bufferId = this.findOutputBufferId(station.shop, line.line, route);
        const buffer = bufferId ? this.buffers.get(bufferId) : null;

        if (!buffer) {
            // Sem buffer - tenta enviar direto para próxima station
            this.tryPushDirectToNextLine(station, car, route);
            return;
        }

        if (buffer.currentCount >= buffer.capacity) {
            this.startFlowStop(station, "NEXT_FULL", "Buffer Full");
            return;
        }

        this.endFlowStop(station, "NEXT_FULL");
        this.removeCarFromStation(station);

        // Fecha trace e atualiza shop leadtime
        car.closeLastTrace(this.event.simulatedTimestamp);
        this.updateShopLeadtime(car, station.shop);

        buffer.cars.push(car);
        buffer.currentCount++;
        this.updateBufferStatus(buffer);

        this.log(`BUFFER_IN: ${car.id} from ${station.id} to ${bufferId}`);
        this.callbacks?.onBufferIn?.(
            car.id,
            bufferId!,
            station.shop,
            line.line,
            station.id,
            this.event.simulatedTimestamp
        );
    }

    // Envia direto para próxima linha (sem buffer)
    private tryPushDirectToNextLine(station: IStation, car: ICar, route: any): void {
        const target = route.to[0];
        const nextStation = this.getStation(target.shop, target.line, target.station || "s1");

        if (!nextStation || nextStation.occupied || this.isStationBlocked(nextStation)) {
            this.startFlowStop(station, "NEXT_FULL", "Next Full");
            return;
        }

        this.endFlowStop(station, "NEXT_FULL");
        this.removeCarFromStation(station);
        car.closeLastTrace(this.event.simulatedTimestamp);

        // Atualiza shop leadtime se mudou de shop
        if (station.shop !== target.shop) {
            this.updateShopLeadtime(car, station.shop);
            car.addShopLeadtime({ shop: target.shop, enteredAt: this.event.simulatedTimestamp });
        }

        this.placeCarInStation(nextStation, car);
        this.log(`MOVE: ${car.id} from ${station.id} to ${nextStation.id}`);
    }

    // Envia carro para rework
    private sendToRework(station: IStation, car: ICar, shop: IShop): void {
        const reworkBufferId = `${station.shop}-REWORK`;
        const buffer = this.buffers.get(reworkBufferId);

        if (!buffer || buffer.currentCount >= buffer.capacity) {
            this.startFlowStop(station, "NEXT_FULL", "Rework Full");
            return;
        }

        this.endFlowStop(station, "NEXT_FULL");
        this.removeCarFromStation(station);

        // Gera defeito com ID incremental
        const defectId = `DEF-${++SimulationFlow.stopIdCounter}`;
        car.addDefect(defectId);
        car.inRework = true;
        car.reworkEnteredAt = this.event.simulatedTimestamp;
        car.closeLastTrace(this.event.simulatedTimestamp);

        buffer.cars.push(car);
        buffer.currentCount++;
        this.updateBufferStatus(buffer);

        this.log(`REWORK_IN: ${car.id} to ${reworkBufferId} (defect: ${defectId})`);
        this.callbacks?.onReworkIn?.(
            car.id,
            reworkBufferId,
            station.shop,
            defectId,
            this.event.simulatedTimestamp
        );
        this.callbacks?.onReworkInDetailed?.(
            car.id,
            reworkBufferId,
            station.shop,
            station.line,
            station.id,
            defectId,
            this.event.simulatedTimestamp
        );
    }

    // Finaliza carro (última station da planta)
    private completeCar(station: IStation, car: ICar): void {
        this.removeCarFromStation(station);
        car.closeLastTrace(this.event.simulatedTimestamp);
        car.complete(this.event.simulatedTimestamp);
        this.updateShopLeadtime(car, station.shop);

        this.log(`CAR_COMPLETED: ${car.id} at ${station.id} (total: ${car.totalLeadtimeMs}ms)`);
        this.callbacks?.onCarProduced?.(car.id);
        this.callbacks?.onCarCompleted?.(
            car.id,
            station.shop,
            station.line,
            station.id,
            car.totalLeadtimeMs!,
            this.event.simulatedTimestamp
        );
    }

    // Processa buffers de rework (tenta enviar carros prontos)
    private processReworkBuffers(): void {
        for (const [bufferId, buffer] of this.buffers) {
            if (buffer.type !== "REWORK_BUFFER") continue;
            if (buffer.cars.length === 0) continue;

            const cars = buffer.cars;
            for (let i = cars.length - 1; i >= 0; i--) {
                const car = cars[i];
                if (!car.reworkEnteredAt) continue;

                const elapsed = this.event.simulatedTimestamp - car.reworkEnteredAt;
                if (elapsed < SimulationFlow.reworkTimeMs) continue;

                // Carro pronto - será puxado pela primeira station na próxima iteração
                // Apenas loga que está disponível
                this.log(`REWORK_READY: ${car.id} in ${bufferId}`);
            }
        }
    }

    // Move carro entre stations
    private moveCar(from: IStation, to: IStation): void {
        const car = from.currentCar;
        if (!car) return;

        this.removeCarFromStation(from);
        car.closeLastTrace(this.event.simulatedTimestamp);

        // Atualiza shop leadtime se mudou de shop
        if (from.shop !== to.shop) {
            this.updateShopLeadtime(car, from.shop);
            car.addShopLeadtime({ shop: to.shop, enteredAt: this.event.simulatedTimestamp });
        }

        this.placeCarInStation(to, car);
        this.log(`MOVE: ${car.id} from ${from.id} to ${to.id}`);
        this.callbacks?.onCarMoved?.(
            car.id,
            from.shop,
            from.line,
            from.id,
            to.shop,
            to.line,
            to.id,
            this.event.simulatedTimestamp
        );
    }

    // Remove carro da station
    private removeCarFromStation(station: IStation): void {
        station.currentCar = null;
        station.occupied = false;
        (station as any).carEnteredAt = undefined;
    }

    // Atualiza leadtime do shop no carro
    private updateShopLeadtime(car: ICar, shopName: string): void {
        const leadtime = car.shopLeadtimes.find(l => l.shop === shopName && !l.exitedAt);
        if (leadtime) {
            leadtime.exitedAt = this.event.simulatedTimestamp;
            leadtime.leadtimeMs = leadtime.exitedAt - leadtime.enteredAt;
        }
    }

    // Inicia parada de flow (NEXT_FULL/PREV_EMPTY) usando StopLine
    private startFlowStop(station: IStation, type: string, reason: string): void {
        // Não inicia parada de flow se a station ainda não recebeu nenhum carro
        if (station.isFirstCar) return;

        if (station.isStopped && station.stopReason === reason) return;

        const category = type === "NEXT_FULL" ? "NEXT_FULL" : "PREV_EMPTY";
        const stop = new StopLine({
            id: ++SimulationFlow.stopIdCounter,
            shop: station.shop,
            line: station.line,
            station: station.id,
            reason,
            startTime: this.event.simulatedTimestamp,
            endTime: 0,
            status: "IN_PROGRESS",
            severity: "LOW",
            type: "PROPAGATION",
            category: category as any,
            durationMs: 0
        });

        this.stops.set(stop.id.toString(), stop);
        station.isStopped = true;
        station.stopReason = reason;
        station.startStop = this.event.simulatedTimestamp;
        station.stopId = stop.id.toString();

        this.callbacks?.onStopStarted?.(
            stop.id.toString(),
            stop.shop,
            stop.line,
            stop.station,
            stop.reason,
            stop.category,
            this.event.simulatedTimestamp
        );
        this.callbacks?.onStopStartedStopLine?.(stop);
    }

    // Finaliza parada de flow e atualiza StopLine
    private endFlowStop(station: IStation, type: string): void {
        const flowReasons = ["NEXT_FULL", "PREV_EMPTY", "Next Full", "Prev Empty", "Buffer Empty", "Buffer Full", "Rework Full"];
        if (!station.isStopped || !flowReasons.includes(station.stopReason || "")) return;

        // Atualiza o StopLine no Map
        if (station.stopId) {
            const stop = this.stops.get(station.stopId);
            if (stop && stop.type === "PROPAGATION") {
                stop.endTime = this.event.simulatedTimestamp;
                stop.status = "COMPLETED";
                stop.durationMs = stop.endTime - stop.startTime;

                this.callbacks?.onStopEnded?.(
                    stop.id.toString(),
                    stop.shop,
                    stop.line,
                    stop.station,
                    stop.reason,
                    stop.durationMs || 0,
                    this.event.simulatedTimestamp
                );
                this.callbacks?.onStopEndedStopLine?.(stop);
            }
        }

        station.isStopped = false;
        station.finishStop = this.event.simulatedTimestamp;
        station.stopReason = undefined;
        station.stopId = undefined;
    }

    // Helpers
    private getStation(shopName: string, lineName: string, stationId: string): IStation | undefined {
        const shop = this.shops.get(shopName);
        if (!shop) return undefined;

        const line = this.getLineFromShop(shop, lineName);
        if (!line) return undefined;

        return line.stations.find((s: IStation) => s.id.includes(stationId));
    }

    private getLineFromShop(shop: IShop, lineName: string): ILine | undefined {
        if (shop.lines instanceof Map) {
            return shop.lines.get(lineName);
        }
        return (shop.lines as Record<string, any>)[lineName] as ILine | undefined;
    }

    private getLinesFromShop(shop: IShop): ILine[] {
        if (shop.lines instanceof Map) {
            return Array.from(shop.lines.values());
        }
        return Object.values(shop.lines) as ILine[];
    }

    private getPreviousStation(station: IStation, line: ILine): IStation | undefined {
        if (station.index === 0) return undefined;
        return line.stations[station.index - 1];
    }

    private getNextStation(station: IStation, line: ILine): IStation | undefined {
        if (station.index >= line.stations.length - 1) return undefined;
        return line.stations[station.index + 1];
    }

    private getRouteForStation(shopName: string, lineName: string, stationId: string): any {
        const shopConfig = (FlowPlant.shops as any)[shopName];
        if (!shopConfig) return null;

        const lineConfig = shopConfig.lines[lineName];
        if (!lineConfig?.routes) return null;

        return lineConfig.routes.find((r: any) =>
            stationId.includes(r.fromStation)
        );
    }

    private findInputBufferId(shopName: string, lineName: string): string | undefined {
        // Procura buffer que aponta para esta linha
        for (const [bufferId, buffer] of this.buffers) {
            if (buffer.to === `${shopName}-${lineName}`) {
                return bufferId;
            }
        }
        return undefined;
    }

    private findOutputBufferId(shopName: string, lineName: string, route: any): string | undefined {
        const target = route.to[0];
        // Procura buffer entre linhas
        for (const [bufferId, buffer] of this.buffers) {
            if (buffer.from === `${shopName}-${lineName}` && buffer.to.includes(target.line)) {
                return bufferId;
            }
        }
        return undefined;
    }

    private findReworkBufferId(shopName: string): string | undefined {
        return `${shopName}-REWORK`;
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

    private getSimTimeMs(): number {
        // Converte horário simulado para ms desde meia-noite
        const date = new Date(this.event.simulatedTimestamp);
        return (date.getHours() * 60 + date.getMinutes()) * 60 * 1000 + date.getSeconds() * 1000;
    }

    private log(message: string): void {
        console.log(`[${this.event.simulatedTimeString}] ${message}`);
    }
}
