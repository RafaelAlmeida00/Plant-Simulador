import { Car } from "../models/Car";

export class CarFactory {
    // Estado interno da Factory para garantir que a sequência incremente corretamente
    private currentSequence: number = 0;
    private idCounter: number = 0;

    // Configurações estáticas para evitar alocações
    private static readonly models = ['P19', 'P20', 'P35'];
    private static readonly modelsLen = 3;
    private static readonly colors = ['Red', 'Blue', 'Green', 'Black', 'White', 'Silver', 'Yellow', 'Orange', 'Purple', 'Gray'];
    private static readonly colorsLen = 10;
    private static readonly idChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    private static readonly idCharsLen = 36;

    /**
     * Cria um carro com dados aleatórios baseados nas regras de negócio
     * @param currentSimulatorTime O tempo atual do relógio do simulador (não Date.now())
     * @param dphu Target de defeitos por 100 unidades
     */
    public createRandomCar(currentSimulatorTime: number, dphu: number): Car {
        this.currentSequence++;

        return new Car({
            id: this.generateId(),
            sequenceNumber: this.currentSequence,
            model: this.getRandomModel(),
            color: this.getRandomColor(),
            createdAt: currentSimulatorTime,
            hasDefect: Math.random() * 100 < dphu,
            inRework: false,
            trace: [],
            shopLeadtimes: [],
            defects: []
        });
    }

    private generateId(): string {
        // ID incremental com prefixo para unicidade - mais rápido que Math.random().toString(36)
        return `C${++this.idCounter}`;
    }

    private getRandomModel(): string {
        return CarFactory.models[(Math.random() * CarFactory.modelsLen) | 0];
    }

    private getRandomColor(): string[] {
        const colors = CarFactory.colors;
        const len = CarFactory.colorsLen;
        const color1 = colors[(Math.random() * len) | 0];
        
        if (Math.random() >= 0.15) {
            return [color1];
        }

        let color2 = colors[(Math.random() * len) | 0];
        while (color1 === color2) {
            color2 = colors[(Math.random() * len) | 0];
        }
        return [color1, color2];
    }
}