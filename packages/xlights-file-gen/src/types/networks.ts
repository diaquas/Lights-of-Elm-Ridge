/**
 * Network & controller types for xLights infrastructure.
 *
 * These types represent the structured data extracted from xlights_networks.xml.
 * Used by Wire:IQ for wiring diagram generation and by xwire for power/cable planning.
 */

/** Controller connection type */
export type ControllerType = "Ethernet" | "Serial" | "Null";

/** Known receiver model identifiers for auto-detection */
const RECEIVER_MODELS = [
  "EasyLights PIX16",
  "EasyLights Pix16",
  "Smart Receiver",
  "SmartReceiver",
  "F4V3",
  "AlphaPix Flex",
] as const;

/** Check if a controller model string indicates a differential receiver */
export function isReceiverModel(model: string): boolean {
  const lower = model.toLowerCase();
  if (lower.includes("receiver")) return true;
  return RECEIVER_MODELS.some((r) => lower.includes(r.toLowerCase()));
}

/** A parsed controller from xlights_networks.xml */
export interface ParsedController {
  /** User-assigned controller name */
  name: string;
  /** Connection type: Ethernet, Serial, or Null */
  type: ControllerType;
  /** IP address (Ethernet controllers only) */
  ip: string;
  /** Communication protocol: E131, ArtNet, DDP, ZCPP */
  protocol: string;
  /** Hardware vendor (e.g., "HinksPix", "Falcon") */
  vendor: string;
  /** Hardware model (e.g., "PRO V3", "F48") */
  model: string;
  /** Hardware variant */
  variant: string;
  /** Whether the controller is active */
  active: boolean;
  /** Whether xLights auto-sizes channels */
  autoSize: boolean;
  /** Whether xLights auto-assigns models to ports */
  autoLayout: boolean;
  /** Whether xLights auto-uploads config to hardware */
  autoUpload: boolean;
  /** Controller ID in xLights */
  id: string;
  /** User description */
  description: string;
  /** Starting universe number */
  startUniverse: number;
  /** Number of universes allocated */
  universeCount: number;
  /** Channels per universe (typically 510 or 512) */
  channelsPerUniverse: number;
  /** Total channel count across all universes */
  totalChannels: number;
  /** FPP proxy IP for bridged networks */
  fppProxy: string;
  /** Forced local interface IP */
  forceLocalIP: string;
  /** E1.31 priority */
  priority: number;
  /** Number of output ports (from controller DB lookup or config) */
  portCount: number;
  /** Maximum pixels per output port */
  maxPixelsPerPort: number;
  /** Whether this is a differential/remote receiver (vs. main controller) */
  isReceiver: boolean;
  /** DIP switch setting if configured */
  dipSwitch: string;
}

/** Complete parsed network configuration */
export interface ParsedNetworkConfig {
  /** All controllers found in the XML */
  controllers: ParsedController[];
  /** Count of main controllers (non-receiver) */
  totalControllers: number;
  /** Count of differential receivers */
  totalReceivers: number;
  /** Total universes across all controllers */
  totalUniverses: number;
  /** Total channels across all controllers */
  totalChannels: number;
  /** Source file name */
  fileName: string;
}

/** A single model bound to a controller port */
export interface PortModel {
  /** Model name from rgbeffects XML */
  modelName: string;
  /** Total pixels for this model on this port */
  pixelCount: number;
  /** Starting pixel position in the port chain (1-based) */
  startPixel: number;
  /** Order in the chain: 0 = first, 1 = second, etc. */
  chainOrder: number;
}

/** A resolved port binding: controller port → models */
export interface PortBinding {
  /** Controller name this port belongs to */
  controllerName: string;
  /** Port number (1-based) */
  port: number;
  /** Models chained on this port, in chain order */
  models: PortModel[];
  /** Total pixels across all chained models */
  totalPixels: number;
  /** Maximum allowed pixels for this port */
  maxPixels: number;
  /** Utilization as percentage (0-100) */
  utilizationPercent: number;
  /** Whether this port exceeds its pixel budget */
  isOverloaded: boolean;
}

/** Raw parsed port reference from a model's StartChannel attribute */
export interface StartChannelRef {
  /** Format detected: "bang" (!Controller:port:pixel) or "universe" (>universe:channel) */
  format: "bang" | "universe" | "unknown";
  /** Controller name (bang format only) */
  controllerName?: string;
  /** Port number (bang format only) */
  port?: number;
  /** Starting pixel on the port (bang format only, 1-based) */
  startPixel?: number;
  /** Universe number (universe format only) */
  universe?: number;
  /** Channel within universe (universe format only) */
  channel?: number;
  /** Raw StartChannel string */
  raw: string;
}
