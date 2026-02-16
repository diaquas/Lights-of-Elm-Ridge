/**
 * Display package types for the Shop Wizard.
 */

export type PackageTier = "starter" | "yard-show" | "full-production" | "the-beast";

export interface ShoppingListItem {
  name: string;
  vendor: string;
  quantity: number;
  unitPrice: number;
  affiliateUrl?: string;
  category: "prop" | "controller" | "power" | "cable" | "mounting";
}

export interface DisplayPackage {
  tier: PackageTier;
  name: string;
  description: string;
  estimatedPixels: number;
  estimatedControllers: number;
  props: { type: string; count: number; pixelsEach: number }[];
  shoppingList: ShoppingListItem[];
}
