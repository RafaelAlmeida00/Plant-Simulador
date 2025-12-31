import { IFlowPlant } from "../../utils/shared";

export const FlowPlant: IFlowPlant = {

  typeSpeedFactor: 1,

  stationstartProduction: [
    { shop: "Paint", line: "Paint_In", station: "s1" }
  ],

  shifts: [
    { id: "TURNO_1", start: "07:00", end: "16:48" },
    { id: "TURNO_2", start: "17:00", end: "23:48" }
  ],

  plannedStops: [
    // Almoço Paint: 11:00-12:00
    {
      id: "LUNCH_PAINT",
      name: "Almoço Paint",
      type: "LUNCH",
      reason: "LUNCH",
      affectsShops: ["Paint"],
      startTime: "11:00",
      durationMn: 60,  // 1 hora
      daysOfWeek: [1, 2, 3, 4, 5, 6]  // Seg-Sáb
    },
    // Almoço Trim: 12:00-13:00
    {
      id: "LUNCH_TRIM",
      name: "Almoço Trim",
      type: "LUNCH",
      reason: "LUNCH",
      affectsShops: ["Trim"],
      startTime: "12:00",
      durationMn: 60,  // 1 hora
      daysOfWeek: [1, 2, 3, 4, 5, 6]
    },
    // Reunião Terça 9h por 40min (toda fábrica)
    {
      id: "MEETING_TUESDAY",
      name: "Reunião Terça",
      type: "MEETING",
      reason: "MEETING",
      startTime: "09:00",
      durationMn: 40,  // 40 minutos
      daysOfWeek: [2]  // Terça
    },
    // Troca de turno: 16:48-17:00 (12 min)
    {
      id: "SHIFT_CHANGE",
      name: "Troca de Turno",
      type: "SHIFT_CHANGE",
      reason: "SHIFT_CHANGE",
      startTime: "16:48",
      durationMn: 12,  // 12 minutos
      daysOfWeek: [1, 2, 3, 4, 5, 6]
    },
    // Parada noturna: 23:48-07:00
    {
      id: "NIGHT_STOP",
      name: "Parada Noturna",
      type: "NIGHT_STOP",
      reason: "NIGHT_STOP",
      startTime: "23:48",
      durationMn: 432,  // 7h12min até 07:00
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
    }
  ],

  DPHU: 5,
  Rework_Time: 60,
  targetJPH: 28,     // JPH alvo padrão
  oeeTargets: {
    Paint: 0.95,
    Trim: 0.95
  },

  shops: {

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
            { to: { shop: "Trim", line: "Trim_A" }, capacity: 30 },
          ],
          routes: [
            {
              fromStation: "s8",
              to: [
                { shop: "Trim", line: "Trim_A", station: "s1" }
              ]
            }
          ]
        }
      },
      name: "Paint"
    },

    Trim: {
      bufferCapacity: 60,
      reworkBuffer: 30,
      lines: {
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

        "C3": {
            MTTR: Math.random() * 10 + 2,
          MTBF: Math.random() * 100 + 20,
          stations: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"],
          takt: { jph: 28, leadtime: 8 / 28, shiftStart: "07:00", shiftEnd: "23:48" },
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
          // s1 precisa sincronizar com Door Line (espera porta)
          buffers: [], // Última linha - saída do fluxo
          routes: [] // Sem rotas - carros saem do sistema
        }
      },
      name: "Trim"
    }
  }
};
