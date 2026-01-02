import { IFlowPlant } from "../../utils/shared";

export const FlowPlant: IFlowPlant = {

  typeSpeedFactor: 1,
  stationTaktMinFraction: 0.7,
  stationTaktMaxFraction: 0.999,
  stationstartProduction: [
    // Body - onde o carro nasce
    { shop: "Body", line: "BodyMain", station: "s1" },
    // PWT Part Lines - linhas de peças do Powertrain
    { shop: "PWT", line: "ShortLine", station: "s1" },
    { shop: "PWT", line: "CylinderHead", station: "s1" },
    // Body Part Lines - linhas de peças do Body
    { shop: "Body", line: "EngComp", station: "s1" },
    { shop: "Body", line: "FrontFloor", station: "s1" },
    { shop: "Body", line: "RearFloor", station: "s1" },
    { shop: "Body", line: "BodySideRH", station: "s1" },
    { shop: "Body", line: "BodySideLH", station: "s1" },
    { shop: "Body", line: "CoverHemming", station: "s1" },
    // Trim Part Lines
    { shop: "Trim", line: "DoorLine", station: "s1" }
  ],
  shifts: [
    { id: "TURNO_1", start: "07:00", end: "16:48" },
    { id: "TURNO_2", start: "17:00", end: "23:48" }
  ],
  plannedStops: [
    {
      id: "LUNCH_BODY",
      name: "Almoço Body",
      type: "LUNCH",
      reason: "LUNCH",
      affectsShops: ["Body"],
      startTime: "12:00",
      durationMn: 60,
      daysOfWeek: [1, 2, 3, 4, 5, 6]
    },
    {
      id: "LUNCH_PWT",
      name: "Almoço PWT",
      type: "LUNCH",
      reason: "LUNCH",
      affectsShops: ["PWT"],
      startTime: "12:00",
      durationMn: 60,
      daysOfWeek: [1, 2, 3, 4, 5, 6]
    },
    {
      id: "LUNCH_PAINT",
      name: "Almoço Paint",
      type: "LUNCH",
      reason: "LUNCH",
      affectsShops: ["Paint"],
      startTime: "11:30",
      durationMn: 60,
      daysOfWeek: [1, 2, 3, 4, 5, 6]
    },
    {
      id: "LUNCH_TRIM",
      name: "Almoço Trim",
      type: "LUNCH",
      reason: "LUNCH",
      affectsShops: ["Trim"],
      startTime: "11:00",
      durationMn: 60,
      daysOfWeek: [1, 2, 3, 4, 5, 6]
    },
    {
      id: "LUNCH_QUALIDADE",
      name: "Almoço Qualidade",
      type: "LUNCH",
      reason: "LUNCH",
      affectsShops: ["Qualidade"],
      startTime: "11:00",
      durationMn: 60,
      daysOfWeek: [1, 2, 3, 4, 5, 6]
    },
    {
      id: "MEETING_TUESDAY",
      name: "Reunião Terça",
      type: "MEETING",
      reason: "MEETING",
      startTime: "09:00",
      durationMn: 40,
      daysOfWeek: [2]
    },
    {
      id: "SHIFT_CHANGE",
      name: "Troca de Turno",
      type: "SHIFT_CHANGE",
      reason: "SHIFT_CHANGE",
      startTime: "16:48",
      durationMn: 12,
      daysOfWeek: [1, 2, 3, 4, 5, 6]
    },
    {
      id: "NIGHT_STOP",
      name: "Parada Noturna",
      type: "NIGHT_STOP",
      reason: "NIGHT_STOP",
      startTime: "23:48",
      durationMn: 432,
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
    }
  ],

  DPHU: 5,
  Rework_Time: 60,
  targetJPH: 28,
  oeeTargets: {
    PWT: 0.85,
    Body: 0.85,
    Paint: 0.85,
    Trim: 0.85,
    Qualidade: 0.95
  },

  shops: {

    // =========================================================================
    // SHOP: PWT (POWERTRAIN) - Linhas de peças (motores)
    // =========================================================================
    PWT: {
      bufferCapacity: 5000,
      reworkBuffer: 1000,
      lines: {
        // CylinderHead - linha independente que alimenta ShortLine na s6
        "CylinderHead": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6"],
          takt: { jph: 28, leadtime: 6 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "CYLINDER_HEAD",
          buffers: [
            { to: { shop: "PWT", line: "ShortLine" }, capacity: 30 }
          ],
          routes: [
            {
              fromStation: "s6",
              to: [{ shop: "PWT", line: "ShortLine", station: "s6" }]
            }
          ]
        },

        // ShortLine - primeira linha do motor, nasce o motor na s1
        "ShortLine": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6"],
          takt: { jph: 28, leadtime: 6 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "ENGINE",
          requiredParts: [
            { partType: "CYLINDER_HEAD", consumeStation: "s6" }
          ],
          buffers: [
            { to: { shop: "PWT", line: "BareLine" }, capacity: 1 }
          ],
          routes: [
            {
              fromStation: "s6",
              to: [{ shop: "PWT", line: "BareLine", station: "s1" }]
            }
          ]
        },

        // BareLine - 10 stations
        "BareLine": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"],
          takt: { jph: 28, leadtime: 10 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "ENGINE",
          buffers: [
            { to: { shop: "PWT", line: "MainLine" }, capacity: 1 }
          ],
          routes: [
            {
              fromStation: "s10",
              to: [{ shop: "PWT", line: "MainLine", station: "s1" }]
            }
          ]
        },

        // MainLine - 15 stations
        "MainLine": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12", "s13", "s14", "s15"],
          takt: { jph: 28, leadtime: 15 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "ENGINE",
          buffers: [
            { to: { shop: "PWT", line: "FTB" }, capacity: 1 }
          ],
          routes: [
            {
              fromStation: "s15",
              to: [{ shop: "PWT", line: "FTB", station: "s1" }]
            }
          ]
        },

        // FTB - Final Test Bench - 4 stations, cai no buffer do shop
        "FTB": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4"],
          takt: { jph: 28, leadtime: 4 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "ENGINE",
           buffers: [
            { to: { shop: "Trim", line: "Trim_B" }, capacity: 5000 }
          ],
          routes: [
            {
              fromStation: "s4",
              to: [{ shop: "Trim", line: "Trim_B", station: "s1" }]
            }
          ]
        }
      },
      name: "PWT"
    },

    // =========================================================================
    // SHOP: BODY - Construção da carroceria
    // =========================================================================
    Body: {
      bufferCapacity: 100,
      reworkBuffer: 30,
      lines: {
        // === LINHAS DE PEÇAS (Part Lines) ===

        // EngComp - Engine Compartment
        "EngComp": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"],
          takt: { jph: 28, leadtime: 10 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "ENGINE_COMPARTMENT",
           buffers: [
            { to: { shop: "Body", line: "BodyMain" }, capacity: 20 }
          ],
          routes: [
            {
              fromStation: "s10",
              to: [{ shop: "Body", line: "BodyMain", station: "s1" }]
            }
          ]
        },

        // FrontFloor - Assoalho Dianteiro
        "FrontFloor": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"],
          takt: { jph: 28, leadtime: 10 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "FRONT_FLOOR",
           buffers: [
            { to: { shop: "Body", line: "BodyMain" }, capacity: 20 }
          ],
          routes: [
            {
              fromStation: "s10",
              to: [{ shop: "Body", line: "BodyMain", station: "s1" }]
            }
          ]
        },

        // RearFloor - Assoalho Traseiro
        "RearFloor": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"],
          takt: { jph: 28, leadtime: 10 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "REAR_FLOOR",
          buffers: [
            { to: { shop: "Body", line: "BodyMain" }, capacity: 20 }
          ],
          routes: [
            {
              fromStation: "s10",
              to: [{ shop: "Body", line: "BodyMain", station: "s1" }]
            }
          ]
        },

        // BodySideRH - Lateral Direita (portas)
        "BodySideRH": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12"],
          takt: { jph: 28, leadtime: 12 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "BODY_SIDE_RH",
          buffers: [
            { to: { shop: "Body", line: "BodyMain" }, capacity: 20 }
          ],
          routes: [
            {
              fromStation: "s12",
              to: [{ shop: "Body", line: "BodyMain", station: "s1" }]
            }
          ]
        },

        // BodySideLH - Lateral Esquerda (portas)
        "BodySideLH": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12"],
          takt: { jph: 28, leadtime: 12 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "BODY_SIDE_LH",
         buffers: [
            { to: { shop: "Body", line: "BodyMain" }, capacity: 20 }
          ],
          routes: [
            {
              fromStation: "s12",
              to: [{ shop: "Body", line: "BodyMain", station: "s1" }]
            }
          ]
        },

        // CoverHemming - Cover (consumido pela MetalLine)
        "CoverHemming": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12", "s13", "s14", "s15", "s16", "s17"],
          takt: { jph: 28, leadtime: 17 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "COVER",
           buffers: [
            { to: { shop: "Body", line: "MetalLine" }, capacity: 20 }
          ],
          routes: [
            {
              fromStation: "s17",
              to: [{ shop: "Body", line: "MetalLine", station: "s1" }]
            }
          ]
        },

        // === LINHAS NORMAIS (Carros) ===

        // BodyMain - Linha principal onde o carro nasce e consome peças
        "BodyMain": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
          takt: { jph: 28, leadtime: 8 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          requiredParts: [
            { partType: "ENGINE_COMPARTMENT", consumeStation: "s1" },
            { partType: "FRONT_FLOOR", consumeStation: "s1" },
            { partType: "REAR_FLOOR", consumeStation: "s1" },
            { partType: "BODY_SIDE_RH", consumeStation: "s1" },
            { partType: "BODY_SIDE_LH", consumeStation: "s1" }
          ],
          partConsumptionStation: "s1",
          buffers: [
            { to: { shop: "Body", line: "MetalLine" }, capacity: 20 }
          ],
          routes: [
            {
              fromStation: "s8",
              to: [{ shop: "Body", line: "MetalLine", station: "s1" }]
            }
          ]
        },

        // MetalLine - Consome COVER na s1, última linha antes da pintura
        "MetalLine": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6"],
          takt: { jph: 28, leadtime: 6 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          requiredParts: [
            { partType: "COVER", consumeStation: "s1" }
          ],
          partConsumptionStation: "s1",
          buffers: [
            { to: { shop: "Paint", line: "Paint_In" }, capacity: 30 }
          ],
          routes: [
            {
              fromStation: "s6",
              to: [{ shop: "Paint", line: "Paint_In", station: "s1" }]
            }
          ]
        }
      },
      name: "Body"
    },

    // =========================================================================
    // SHOP: PAINT - Pintura
    // =========================================================================
    Paint: {
      bufferCapacity: 300,
      reworkBuffer: 100,
      lines: {
        "Paint_In": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5"],
          takt: { jph: 28, leadtime: 5 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Paint", line: "PT_ED" }, capacity: 30 }
          ],
          routes: [
            {
              fromStation: "s5",
              to: [{ shop: "Paint", line: "PT_ED", station: "s1" }]
            }
          ]
        },

        "PT_ED": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
          takt: { jph: 28, leadtime: 8 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Paint", line: "Sealer" }, capacity: 30 }
          ],
          routes: [
            {
              fromStation: "s8",
              to: [{ shop: "Paint", line: "Sealer", station: "s1" }]
            }
          ]
        },

        "Sealer": {
          MTTR: 3,
          MTBF: 120,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"],
          takt: { jph: 28, leadtime: 10 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Paint", line: "ED_Sanding" }, capacity: 30 }
          ],
          routes: [
            {
              fromStation: "s10",
              to: [{ shop: "Paint", line: "ED_Sanding", station: "s1" }]
            }
          ]
        },

        "ED_Sanding": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
          takt: { jph: 28, leadtime: 8 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Paint", line: "Top_Coat" }, capacity: 30 }
          ],
          routes: [
            {
              fromStation: "s8",
              to: [{ shop: "Paint", line: "Top_Coat", station: "s1" }]
            }
          ]
        },

        "Top_Coat": {
          MTTR: 3,
          MTBF: 120,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
          takt: { jph: 28, leadtime: 8 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Paint", line: "Finish" }, capacity: 30 }
          ],
          routes: [
            {
              fromStation: "s8",
              to: [{ shop: "Paint", line: "Finish", station: "s1" }]
            }
          ]
        },

        "Finish": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
          takt: { jph: 28, leadtime: 8 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Paint", line: "Paint_Out" }, capacity: 30 }
          ],
          routes: [
            {
              fromStation: "s8",
              to: [{ shop: "Paint", line: "Paint_Out", station: "s1" }]
            }
          ]
        },

        "Paint_Out": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
          takt: { jph: 28, leadtime: 8 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Trim", line: "Trim_A" }, capacity: 30 }
          ],
          routes: [
            {
              fromStation: "s8",
              to: [{ shop: "Trim", line: "Trim_A", station: "s1" }]
            }
          ]
        }
      },
      name: "Paint"
    },

    // =========================================================================
    // SHOP: TRIM - Montagem final
    // =========================================================================
    Trim: {
      bufferCapacity: 60,
      reworkBuffer: 30,
      lines: {
        // === LINHA DE PEÇAS ===

        // DoorLine - Linha de montagem de portas (1 peça = 2 portas)
        "DoorLine": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12", "s13"],
          takt: { jph: 28, leadtime: 13 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          partType: "DOORS",
          createWith: { line: "Paint_Out", station: "s1" },
           buffers: [
            { to: { shop: "Trim", line: "C3" }, capacity: 50 }
          ],
          routes: [
            {
              fromStation: "s13",
              to: [{ shop: "Trim", line: "C3", station: "s1" }]
            }
          ]
        },

        // === LINHAS NORMAIS ===

        "Trim_A": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5"],
          takt: { jph: 28, leadtime: 5 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Trim", line: "Trim_B" }, capacity: 6 }
          ],
          routes: [
            {
              fromStation: "s5",
              to: [{ shop: "Trim", line: "Trim_B", station: "s1" }]
            }
          ]
        },

        "Trim_B": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
          takt: { jph: 28, leadtime: 8 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          requiredParts: [
            { partType: "ENGINE", consumeStation: "s1" }
          ],
          buffers: [
            { to: { shop: "Trim", line: "C1_C2" }, capacity: 6 }
          ],
          routes: [
            {
              fromStation: "s8",
              to: [{ shop: "Trim", line: "C1_C2", station: "s1" }]
            }
          ]
        },

        "C1_C2": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"],
          takt: { jph: 28, leadtime: 10 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Trim", line: "C3" }, capacity: 6 }
          ],
          routes: [
            {
              fromStation: "s10",
              to: [{ shop: "Trim", line: "C3", station: "s1" }]
            }
          ]
        },

        // C3 - Consome DOORS na s1
        "C3": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
          takt: { jph: 28, leadtime: 8 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          requiredParts: [
            { partType: "DOORS", consumeStation: "s1" }
          ],
          partConsumptionStation: "s1",
          buffers: [
            { to: { shop: "Trim", line: "C4" }, capacity: 6 }
          ],
          routes: [
            {
              fromStation: "s8",
              to: [{ shop: "Trim", line: "C4", station: "s1" }]
            }
          ]
        },

        "C4": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
          takt: { jph: 28, leadtime: 8 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Qualidade", line: "CSLine" }, capacity: 6 }
          ],
          routes: [
            {
              fromStation: "s8",
              to: [{ shop: "Qualidade", line: "CSLine", station: "s1" }]
            }
          ]
        }
      },
      name: "Trim"
    },

    // =========================================================================
    // SHOP: QUALIDADE - Inspeção e testes finais
    // =========================================================================
    Qualidade: {
      bufferCapacity: 50,
      reworkBuffer: 20,
      lines: {
        // CSLine - Customer Satisfaction Line
        "CSLine": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6"],
          takt: { jph: 28, leadtime: 6 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Qualidade", line: "TesterLine" }, capacity: 6 }
          ],
          routes: [
            {
              fromStation: "s6",
              to: [{ shop: "Qualidade", line: "TesterLine", station: "s1" }]
            }
          ]
        },

        // TesterLine - Linha de testes
        "TesterLine": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6"],
          takt: { jph: 28, leadtime: 6 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Qualidade", line: "UnderCover" }, capacity: 6 }
          ],
          routes: [
            {
              fromStation: "s6",
              to: [{ shop: "Qualidade", line: "UnderCover", station: "s1" }]
            }
          ]
        },

        // UnderCover - 1 station
        "UnderCover": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1"],
          takt: { jph: 28, leadtime: 1 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Qualidade", line: "ITS" }, capacity: 6 }
          ],
          routes: [
            {
              fromStation: "s1",
              to: [{ shop: "Qualidade", line: "ITS", station: "s1" }]
            }
          ]
        },

        // ITS - Inspection Test System
        "ITS": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6"],
          takt: { jph: 28, leadtime: 6 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Qualidade", line: "Shower" }, capacity: 6 }
          ],
          routes: [
            {
              fromStation: "s6",
              to: [{ shop: "Qualidade", line: "Shower", station: "s1" }]
            }
          ]
        },

        // Shower - Teste de água
        "Shower": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6"],
          takt: { jph: 28, leadtime: 6 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [
            { to: { shop: "Qualidade", line: "Delivery" }, capacity: 6 }
          ],
          routes: [
            {
              fromStation: "s6",
              to: [{ shop: "Qualidade", line: "Delivery", station: "s1" }]
            }
          ]
        },

        // Delivery - Entrega final (1 station, completa o carro)
        "Delivery": {
          MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1"],
          takt: { jph: 28, leadtime: 1 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
          buffers: [],
          routes: []  // Última linha - carro completo
        }
      },
      name: "Qualidade"
    }
  }
};