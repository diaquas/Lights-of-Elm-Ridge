/**
 * Controller Port Specifications
 *
 * Max amperage per port by controller model.
 * Re-exports from xlights-file-gen for convenience.
 */

// TODO: Import from @lightsofelmridge/xlights-file-gen when wired up
// For now, define locally

export interface ControllerPortSpec {
  vendor: string;
  model: string;
  portsCount: number;
  maxAmpsPerPort: number;
  fusedPorts: boolean;
}

export const CONTROLLER_PORT_SPECS: ControllerPortSpec[] = [
  { vendor: "HinksPix", model: "PRO V3", portsCount: 48, maxAmpsPerPort: 6, fusedPorts: true },
  { vendor: "Falcon", model: "F16V4", portsCount: 16, maxAmpsPerPort: 9, fusedPorts: true },
  { vendor: "Falcon", model: "F48", portsCount: 48, maxAmpsPerPort: 6, fusedPorts: true },
  { vendor: "Falcon", model: "F4V3", portsCount: 4, maxAmpsPerPort: 9, fusedPorts: false },
];
