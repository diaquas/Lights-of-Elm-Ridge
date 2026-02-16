/**
 * Universe Calculator
 *
 * Converts pixel counts to E1.31 universe requirements.
 *   pixels × 3 = channels (RGB)
 *   ceil(channels / 510) = universes
 *
 * 510 channels per universe (not 512) because xLights reserves 2 for protocol overhead.
 */

const CHANNELS_PER_PIXEL = 3; // RGB
const CHANNELS_PER_UNIVERSE = 510;

export function pixelsToChannels(pixels: number): number {
  return pixels * CHANNELS_PER_PIXEL;
}

export function channelsToUniverses(channels: number): number {
  return Math.ceil(channels / CHANNELS_PER_UNIVERSE);
}

export function pixelsToUniverses(pixels: number): number {
  return channelsToUniverses(pixelsToChannels(pixels));
}

export interface UniverseBreakdown {
  totalPixels: number;
  totalChannels: number;
  totalUniverses: number;
  startUniverse: number;
  endUniverse: number;
}

export function calculateUniverses(
  pixels: number,
  startUniverse: number = 1,
): UniverseBreakdown {
  const channels = pixelsToChannels(pixels);
  const universes = channelsToUniverses(channels);
  return {
    totalPixels: pixels,
    totalChannels: channels,
    totalUniverses: universes,
    startUniverse,
    endUniverse: startUniverse + universes - 1,
  };
}
