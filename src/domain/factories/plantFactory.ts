// src/domain/factories/PlantFactory.ts

import { FlowPlant } from "../config/flowPlant";
import { ILine, Line } from "../models/Line";
import { IShop, Shop } from "../models/Shop";
import { IStation, Station } from "../models/Station";

// Cache para evitar recálculos
const flowPlantShopKeys: string[] = Object.keys(FlowPlant.shops);

export function distributeTaktAmongStations(lineTaktMs: number, stationCount: number): number[] {
    if (stationCount === 0) return [];
    if (stationCount === 1) return [lineTaktMs];

    const maxFeasibleMinFraction = 0.9 / stationCount;
    const minFraction = maxFeasibleMinFraction < 0.05 ? maxFeasibleMinFraction : 0.05;

    const minMs = (lineTaktMs * minFraction) | 0 || 1;
    const takts = new Array<number>(stationCount);
    let remaining = lineTaktMs - minMs * stationCount;

    if (remaining < 0) {
        const equal = (lineTaktMs / stationCount + 0.5) | 0;
        let sum = 0;
        for (let i = 0; i < stationCount; i++) {
            takts[i] = equal;
            sum += equal;
        }
        takts[stationCount - 1] += lineTaktMs - sum;
        return takts;
    }

    // Distribuir o restante de forma aleatória e desigual
    const weights = new Array<number>(stationCount);
    let weightSum = 0;
    for (let i = 0; i < stationCount; i++) {
        const w = 0.2 + Math.random() * 1.6;
        weights[i] = w;
        weightSum += w;
    }

    const extra = new Array<number>(stationCount);
    let extraSum = 0;
    for (let i = 0; i < stationCount; i++) {
        const e = (weights[i] / weightSum * remaining) | 0;
        extra[i] = e;
        extraSum += e;
    }

    let diff = remaining - extraSum;
    let idx = 0;
    while (diff !== 0 && idx < 10000) {
        const i = idx % stationCount;
        if (diff > 0) {
            extra[i]++;
            diff--;
        } else if (extra[i] > 0) {
            extra[i]--;
            diff++;
        }
        idx++;
    }

    let finalSum = 0;
    for (let i = 0; i < stationCount; i++) {
        takts[i] = minMs + extra[i];
        finalSum += takts[i];
    }
    takts[stationCount - 1] += lineTaktMs - finalSum;

    if (takts[stationCount - 1] < 1) {
        takts[stationCount - 1] = 1;
    }

    return takts;
}


export class PlantFactory {

    public createShop(shopName: string): IShop {
        const shopConfig = FlowPlant.shops[shopName];
        if (!shopConfig) throw new Error(`Shop ${shopName} not found in config`);

        const linesMap = new Map<string, ILine>();
        const linesEntries = Object.entries(shopConfig.lines);

        for (let lineIdx = 0; lineIdx < linesEntries.length; lineIdx++) {
            const [lineName, lineConfig] = linesEntries[lineIdx];

            // Calcular tempo de produção inline para evitar criação de função a cada iteração
            const takt = lineConfig.takt;
            const startHour = parseInt(takt.shiftStart.substring(0, 2), 10);
            const startMinute = parseInt(takt.shiftStart.substring(3, 5), 10);
            const endHour = parseInt(takt.shiftEnd.substring(0, 2), 10);
            const endMinute = parseInt(takt.shiftEnd.substring(3, 5), 10);

            let timeChangeShift = 0;
            if (takt.firstShiftEnd && takt.secondeShiftStart) {
                const endHourFirstShift = parseInt(takt.firstShiftEnd.substring(0, 2), 10);
                const endMinuteFirstShift = parseInt(takt.firstShiftEnd.substring(3, 5), 10);
                const startHourSecondShift = parseInt(takt.secondeShiftStart.substring(0, 2), 10);
                const startMinuteSecondShift = parseInt(takt.secondeShiftStart.substring(3, 5), 10);
                timeChangeShift = (endHourFirstShift * 60 + endMinuteFirstShift) - (startHourSecondShift * 60 + startMinuteSecondShift);
            }

            let timePlannedStops = 0;
            const plannedStops = FlowPlant.plannedStops;
            if (plannedStops) {
                const stopsLen = plannedStops.length;
                for (let i = 0; i < stopsLen; i++) {
                    const stop = plannedStops[i];
                    if (!stop.affectsShops || stop.affectsShops.includes(shopName)) {
                        timePlannedStops += stop.durationMn;
                    }
                }
            }

            const productionTimeMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute) - timeChangeShift - timePlannedStops;
            const lineTaktMs = (productionTimeMinutes / ((productionTimeMinutes / 60) * takt.jph)) * 60000;

            const stationNames = lineConfig.stations;
            const stationCount = stationNames.length;
            const stationTakts = distributeTaktAmongStations(lineTaktMs, stationCount);

            const stations: IStation[] = new Array(stationCount);
            for (let i = 0; i < stationCount; i++) {
                stations[i] = new Station({
                    id: `${shopName}-${lineName}-${stationNames[i]}`,
                    shop: shopName,
                    line: lineName,
                    index: i,
                    taktMn: stationTakts[i] / 60000,
                    isFirstStation: i === 0,
                    isLastStation: i === stationCount - 1,
                    occupied: false,
                    currentCar: null,
                    isStopped: false,
                    startStop: 0,
                    finishStop: 0,
                    isFirstCar: true
                });
            }

            const newLine = new Line({
                shop: shopName,
                line: lineName,
                stations: stations,
                taktMn: lineTaktMs / 60000,
                isFeederLine: lineConfig.isFeederLine,
                feedsToLine: lineConfig.feedsToLine,
                feedsToStation: lineConfig.feedsToStation,
                MTTR: lineConfig.MTTR,
                MTBF: lineConfig.MTBF,
                productionTimeMinutes: productionTimeMinutes
            });

            linesMap.set(lineName, newLine);
        }

        return new Shop({
            name: shopName,
            lines: linesMap,
            bufferCapacity: shopConfig.bufferCapacity ?? 0, 
            reworkBuffer: shopConfig.reworkBuffer ?? 0,
        });
    }


    public createAllShops(): Map<string, IShop> {
        const allShops = new Map<string, IShop>();
        const keysLen = flowPlantShopKeys.length;
        for (let i = 0; i < keysLen; i++) {
            const shopKey = flowPlantShopKeys[i];
            allShops.set(shopKey, this.createShop(shopKey));
        }
        return allShops;
    }
}