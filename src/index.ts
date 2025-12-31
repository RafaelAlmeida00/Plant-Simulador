import { Server } from "./adapters/http/server";
import { SimulationFactory } from "./domain/factories/SimulationFactory";
import { simulationEventEmitter } from "./adapters/http/websocket/SimulationEventEmitter";

export async function StartSimulation() {
    const simulation = SimulationFactory.create({
        onCarCreated: (carId, shop, line, station, timestamp) => {
            void simulationEventEmitter.emitCarCreated(carId, shop, line, station, timestamp);
        },
        onCarMoved: (carId, fromShop, fromLine, fromStation, toShop, toLine, toStation, timestamp) => {
            void simulationEventEmitter.emitCarMoved(carId, fromShop, fromLine, fromStation, toShop, toLine, toStation, timestamp);
        },
        onCarCompleted: (carId, shop, line, station, totalLeadtimeMs, timestamp) => {
            void simulationEventEmitter.emitCarCompleted(carId, shop, line, station, timestamp, totalLeadtimeMs);
        },
        onBufferIn: (carId, bufferId, shop, line, fromStation, timestamp) => {
            void simulationEventEmitter.emitBufferIn(carId, bufferId, shop, line, fromStation, timestamp);
        },
        onBufferOut: (carId, bufferId, shop, line, toStation, timestamp) => {
            void simulationEventEmitter.emitBufferOut(carId, bufferId, shop, line, toStation, timestamp);
        },
        onReworkInDetailed: (carId, bufferId, shop, line, station, defectId, timestamp) => {
            void simulationEventEmitter.emitReworkIn(carId, bufferId, shop, line, station, defectId, timestamp);
        },
        onReworkOutDetailed: (carId, bufferId, shop, line, station, timestamp) => {
            void simulationEventEmitter.emitReworkOut(carId, bufferId, shop, line, station, timestamp);
        },
        onStopStartedStopLine: (stop) => {
            void simulationEventEmitter.emitStopStarted(stop);
        },
        onStopEndedStopLine: (stop) => {
            void simulationEventEmitter.emitStopEnded(stop);
        }
    });

    simulation.start();
    return simulation;
}

async function main(): Promise<void> {
    const server = new Server();
    const simulation = await StartSimulation();

    server.setSimulatorClock(simulation);

    // Emit estados periódicos (com throttling dentro do emitter)
    simulation.onTick((tick) => {
        void simulationEventEmitter.emitAllStops(simulation.getStops());
        void simulationEventEmitter.emitAllBuffers(simulation.getBuffers(), tick.simulatedTimestamp);
        void simulationEventEmitter.emitPlantState(simulation.getPlantSnapshot());
    });

    await server.listen();
}

main().catch((error) => {
    console.error('[BOOT] Fatal error during startup:', error);
    process.exitCode = 1;
});
