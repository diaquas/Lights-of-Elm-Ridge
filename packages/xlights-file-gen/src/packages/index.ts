/**
 * Pre-built Display Package Definitions
 *
 * Opinionated starter packages for new xLights users.
 * Each tier builds on the previous one.
 *
 * TODO: Implement with real prop counts and shopping lists
 */

import type { DisplayPackage, PackageTier } from "../types/packages";

export const PACKAGES: Record<PackageTier, DisplayPackage> = {
  starter: {
    tier: "starter",
    name: "Starter",
    description: "House outline + 4 candy canes. The classic first display.",
    estimatedPixels: 600,
    estimatedControllers: 1,
    props: [
      { type: "house-outline", count: 1, pixelsEach: 500 },
      { type: "candy-cane", count: 4, pixelsEach: 25 },
    ],
    shoppingList: [], // TODO
  },
  "yard-show": {
    tier: "yard-show",
    name: "Yard Show",
    description: "Starter + mega tree, arches, mini trees. A real neighborhood attraction.",
    estimatedPixels: 5000,
    estimatedControllers: 1,
    props: [
      { type: "house-outline", count: 1, pixelsEach: 500 },
      { type: "candy-cane", count: 4, pixelsEach: 25 },
      { type: "mega-tree", count: 1, pixelsEach: 3200 },
      { type: "arch", count: 4, pixelsEach: 25 },
      { type: "mini-tree", count: 6, pixelsEach: 50 },
    ],
    shoppingList: [], // TODO
  },
  "full-production": {
    tier: "full-production",
    name: "Full Production",
    description: "Yard Show + matrix, snowflakes, singing faces. The works.",
    estimatedPixels: 12000,
    estimatedControllers: 2,
    props: [
      { type: "house-outline", count: 1, pixelsEach: 500 },
      { type: "candy-cane", count: 8, pixelsEach: 25 },
      { type: "mega-tree", count: 1, pixelsEach: 3200 },
      { type: "arch", count: 8, pixelsEach: 50 },
      { type: "mini-tree", count: 12, pixelsEach: 50 },
      { type: "matrix", count: 1, pixelsEach: 2048 },
      { type: "snowflake", count: 6, pixelsEach: 80 },
      { type: "wreath", count: 2, pixelsEach: 170 },
      { type: "star", count: 1, pixelsEach: 100 },
    ],
    shoppingList: [], // TODO
  },
  "the-beast": {
    tier: "the-beast",
    name: "The Beast",
    description: "Full Production + HD spinners, pixel forest, flood lights. The Elm Ridge experience.",
    estimatedPixels: 25000,
    estimatedControllers: 3,
    props: [
      { type: "house-outline", count: 1, pixelsEach: 500 },
      { type: "candy-cane", count: 12, pixelsEach: 25 },
      { type: "mega-tree", count: 2, pixelsEach: 3200 },
      { type: "arch", count: 12, pixelsEach: 50 },
      { type: "mini-tree", count: 20, pixelsEach: 50 },
      { type: "matrix", count: 1, pixelsEach: 2048 },
      { type: "snowflake", count: 8, pixelsEach: 80 },
      { type: "wreath", count: 4, pixelsEach: 170 },
      { type: "star", count: 2, pixelsEach: 100 },
      { type: "spinner", count: 4, pixelsEach: 180 },
    ],
    shoppingList: [], // TODO
  },
};
