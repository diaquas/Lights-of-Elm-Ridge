/**
 * xLights networks.xml Parser
 *
 * Parses xlights_networks.xml files to extract controller and network
 * configuration data. Used by Wire:IQ for wiring diagram generation.
 *
 * XML Structure:
 *   <Networks>
 *     <Controller type="Ethernet" Name="Main" IP="192.168.1.50" ...>
 *       <network NetworkType="E131" MaxChannels="512" NumUniverses="96" StartUniverse="1" />
 *     </Controller>
 *   </Networks>
 */

import type { ParsedController, ParsedNetworkConfig } from "../types/networks";
import { isReceiverModel } from "../types/networks";
import { findController } from "../models/controller-db";

/**
 * Parse an xlights_networks.xml string into structured controller data.
 *
 * @param xmlString - Raw XML content of xlights_networks.xml
 * @param fileName - Source file name for diagnostics
 * @returns Parsed network configuration with all controllers
 */
export function parseNetworksXml(
  xmlString: string,
  fileName: string = "xlights_networks.xml",
): ParsedNetworkConfig {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) {
    throw new Error(`Invalid XML file: ${parseError.textContent}`);
  }

  const controllerElements = doc.querySelectorAll("Controller");
  const controllers: ParsedController[] = [];

  controllerElements.forEach((el) => {
    const controller = parseControllerElement(el);
    if (controller) {
      controllers.push(controller);
    }
  });

  const totalReceivers = controllers.filter((c) => c.isReceiver).length;

  return {
    controllers,
    totalControllers: controllers.length - totalReceivers,
    totalReceivers,
    totalUniverses: controllers.reduce((sum, c) => sum + c.universeCount, 0),
    totalChannels: controllers.reduce((sum, c) => sum + c.totalChannels, 0),
    fileName,
  };
}

/**
 * Parse a single <Controller> element.
 */
function parseControllerElement(el: Element): ParsedController | null {
  const type = el.getAttribute("type") || el.getAttribute("Type") || "";
  const name = el.getAttribute("Name") || el.getAttribute("name") || "";

  // Skip null controllers — they're placeholders
  if (type.toLowerCase() === "null" || !name) return null;

  const vendor = el.getAttribute("Vendor") || el.getAttribute("vendor") || "";
  const model = el.getAttribute("Model") || el.getAttribute("model") || "";
  const variant =
    el.getAttribute("Variant") || el.getAttribute("variant") || "";
  const ip = el.getAttribute("IP") || el.getAttribute("ip") || "";
  const protocol =
    el.getAttribute("Protocol") || el.getAttribute("protocol") || "";
  const id = el.getAttribute("Id") || el.getAttribute("id") || "";
  const description =
    el.getAttribute("Description") || el.getAttribute("description") || "";
  const fppProxy =
    el.getAttribute("FPPProxy") || el.getAttribute("fppProxy") || "";
  const forceLocalIP =
    el.getAttribute("ForceLocalIP") || el.getAttribute("forceLocalIP") || "";
  const priority = parseInt(el.getAttribute("Priority") || "100") || 100;

  const active = el.getAttribute("Active") !== "0";
  const autoSize = el.getAttribute("AutoSize") === "1";
  const autoLayout = el.getAttribute("AutoLayout") === "1";
  const autoUpload = el.getAttribute("AutoUpload") === "1";

  // Parse nested <network> elements for universe config
  const networkEl = el.querySelector("network");
  let startUniverse = 1;
  let universeCount = 0;
  let channelsPerUniverse = 512;
  let totalChannels = 0;

  if (networkEl) {
    startUniverse =
      parseInt(networkEl.getAttribute("StartUniverse") || "1") || 1;
    universeCount =
      parseInt(networkEl.getAttribute("NumUniverses") || "0") || 0;
    channelsPerUniverse =
      parseInt(networkEl.getAttribute("MaxChannels") || "512") || 512;
    totalChannels =
      parseInt(networkEl.getAttribute("Channels") || "0") ||
      universeCount * channelsPerUniverse;
  }

  // If no <network> child, check for multiple <network> children
  if (!networkEl) {
    const networkEls = el.querySelectorAll("network");
    networkEls.forEach((net) => {
      const numUniv = parseInt(net.getAttribute("NumUniverses") || "1") || 1;
      const maxChan = parseInt(net.getAttribute("MaxChannels") || "512") || 512;
      universeCount += numUniv;
      totalChannels += numUniv * maxChan;
      if (startUniverse === 1) {
        startUniverse = parseInt(net.getAttribute("StartUniverse") || "1") || 1;
      }
      channelsPerUniverse = maxChan;
    });
  }

  // Look up controller specs from the database for port count / max pixels
  const dbSpec = findController(vendor, model);
  const portCount = dbSpec?.ports ?? inferPortCount(model);
  const maxPixelsPerPort = dbSpec?.maxPixelsPerPort ?? 1024;

  // Detect if this is a differential receiver
  const isReceiver = isReceiverModel(model);

  // DIP switch — not stored in XML, but we include the field for manual entry
  const dipSwitch = "";

  const controllerType = normalizeControllerType(type);

  return {
    name,
    type: controllerType,
    ip,
    protocol: normalizeProtocol(protocol),
    vendor,
    model,
    variant,
    active,
    autoSize,
    autoLayout,
    autoUpload,
    id,
    description,
    startUniverse,
    universeCount,
    channelsPerUniverse,
    totalChannels,
    fppProxy,
    forceLocalIP,
    priority,
    portCount,
    maxPixelsPerPort,
    isReceiver,
    dipSwitch,
  };
}

/**
 * Normalize controller type string to enum.
 */
function normalizeControllerType(type: string): "Ethernet" | "Serial" | "Null" {
  const lower = type.toLowerCase();
  if (lower.includes("ethernet") || lower === "e131" || lower === "artnet") {
    return "Ethernet";
  }
  if (lower.includes("serial") || lower === "dmx" || lower === "pixelnet") {
    return "Serial";
  }
  return "Null";
}

/**
 * Normalize protocol string to standard format.
 */
function normalizeProtocol(protocol: string): string {
  const upper = protocol.toUpperCase();
  const protocolMap: Record<string, string> = {
    E131: "E1.31",
    "E1.31": "E1.31",
    ARTNET: "ArtNet",
    DDP: "DDP",
    ZCPP: "ZCPP",
    DMX: "DMX",
    PIXELNET: "Pixelnet",
    RENARD: "Renard",
  };
  return protocolMap[upper] || protocol;
}

/**
 * Infer port count from model name when not in controller database.
 */
function inferPortCount(model: string): number {
  // Extract numbers from model name (e.g., "F48" → 48, "PIX16" → 16)
  const match = model.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    // Common port counts: 4, 8, 16, 32, 48
    if ([4, 8, 16, 32, 48].includes(num)) return num;
  }
  return 16; // Safe default
}
