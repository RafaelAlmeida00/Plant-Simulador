import { ICar } from "./Car";
import { IStation } from "./Station";

export interface ILine {
  shop: string;
  line: string;
  stations: IStation[];
  taktMn: number;
  isFeederLine?: boolean;
  feedsToLine?: string;
  feedsToStation?: string;
  MTTR?: number;
  MTBF?: number;
  productionTimeMinutes?: number;
}

export class Line {
  public id: string;
  public shop: string;
  public line: string;
  public stations: IStation[];
  public taktMn: number;
  public isFeederLine: boolean;
  public feedsToLine?: string;
  public feedsToStation?: string;
  public MTTR?: number;
  public MTBF?: number;
  productionTimeMinutes?: number;


  constructor(config: ILine) {
    this.id = `${config.shop}-${config.line}`;
    this.shop = config.shop;
    this.line = config.line;
    this.stations = config.stations;
    this.taktMn = config.taktMn;
    this.isFeederLine = config.isFeederLine ?? false;
    this.feedsToLine = config.feedsToLine;
    this.feedsToStation = config.feedsToStation;
    this.MTTR = config.MTTR;
    this.MTBF = config.MTBF;
    this.productionTimeMinutes = config.productionTimeMinutes;
  }

  /** Retorna todas as estações da linha em ordem */
  public getAllStations(): IStation[] {
    return this.stations;
  }

  /** Retorna todas as estações em ordem reversa (última -> primeira) */
  public getAllStationsReverse(): IStation[] {
    const len = this.stations.length;
    const result = new Array<IStation>(len);
    for (let i = 0; i < len; i++) {
      result[i] = this.stations[len - 1 - i];
    }
    return result;
  }

  /** Retorna uma estação pelo índice */
  public getStationByIndex(index: number): IStation | undefined {
    return this.stations[index];
  }

  /** Retorna a primeira estação da linha */
  public getFirstStation(): IStation | undefined {
    return this.stations[0];
  }

  /** Retorna a última estação da linha */
  public getLastStation(): IStation | undefined {
    return this.stations[this.stations.length - 1];
  }

  /** Retorna o número total de estações */
  public getStationCount(): number {
    return this.stations.length;
  }
}
