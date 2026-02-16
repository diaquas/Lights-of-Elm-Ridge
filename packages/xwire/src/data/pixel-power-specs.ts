/**
 * Pixel Power Specifications
 *
 * Power draw per pixel by type/voltage for PSU sizing.
 */

export interface PixelPowerSpec {
  type: string;
  voltage: number;
  wattsPerPixel: number;
  ampsPerPixel: number;
  description: string;
}

export const PIXEL_POWER_SPECS: PixelPowerSpec[] = [
  { type: "WS2811", voltage: 12, wattsPerPixel: 0.3, ampsPerPixel: 0.025, description: "12V bullet pixels (most common)" },
  { type: "WS2811", voltage: 5, wattsPerPixel: 0.3, ampsPerPixel: 0.06, description: "5V bullet pixels" },
  { type: "WS2812B", voltage: 5, wattsPerPixel: 0.3, ampsPerPixel: 0.06, description: "5V addressable strip" },
  { type: "WS2815", voltage: 12, wattsPerPixel: 0.3, ampsPerPixel: 0.025, description: "12V strip with backup data" },
  { type: "SK6812", voltage: 5, wattsPerPixel: 0.36, ampsPerPixel: 0.072, description: "5V RGBW pixels" },
];
