/**
 * Wire Gauge Specifications
 *
 * AWG wire specs for voltage drop and ampacity calculations.
 * Source: NEC tables and manufacturer data.
 */

export interface WireGaugeSpec {
  awg: number;
  maxAmps: number; // at 30°C ambient
  resistancePerFoot: number; // ohms per foot (copper)
  description: string;
}

export const WIRE_GAUGE_TABLE: WireGaugeSpec[] = [
  { awg: 22, maxAmps: 5, resistancePerFoot: 0.0165, description: "Signal wire only" },
  { awg: 20, maxAmps: 7, resistancePerFoot: 0.0104, description: "Short runs, low pixel count" },
  { awg: 18, maxAmps: 10, resistancePerFoot: 0.0065, description: "Standard pixel wire" },
  { awg: 16, maxAmps: 13, resistancePerFoot: 0.0041, description: "Longer runs" },
  { awg: 14, maxAmps: 15, resistancePerFoot: 0.0026, description: "Power injection" },
  { awg: 12, maxAmps: 20, resistancePerFoot: 0.0016, description: "Heavy power runs" },
  { awg: 10, maxAmps: 30, resistancePerFoot: 0.0010, description: "Main power feeds" },
];
