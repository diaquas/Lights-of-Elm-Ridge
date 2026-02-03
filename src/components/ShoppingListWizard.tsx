"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════
   PRODUCT DATABASE
   ═══════════════════════════════════════════════════════════ */

interface Product {
  id: string;
  name: string;
  vendor: string;
  url: string;
  desc: string;
  tier: "essential" | "recommended" | "optional";
  exp: ("beginner" | "intermediate" | "advanced")[];
  space: ("small" | "medium" | "large")[];
  budget: ("starter" | "solid" | "allin")[];
  season: ("halloween" | "christmas" | "both")[];
  qty: { small: number; medium: number; large: number };
  price: number;
  perUnit: boolean;
  ownedCat: string | null;
}

const PRODUCTS: Product[] = [
  // ─── CONTROLLERS ───
  {
    id: "alphapix16",
    name: "AlphaPix 16 Controller",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/AlphaPix-16-V4-p/ap16v4.htm",
    desc: "Starter — 16 ports, 18 universes",
    tier: "essential",
    exp: ["beginner", "intermediate"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 1, medium: 1, large: 1 },
    price: 200,
    perUnit: false,
    ownedCat: "controller",
  },
  {
    id: "hinkspix",
    name: "HinksPix PRO V3",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/HinksPix-PRO-CPU-p/hpprocpu.htm",
    desc: "Beast — 48 ports, 171 universes",
    tier: "essential",
    exp: ["advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 1, large: 1 },
    price: 500,
    perUnit: false,
    ownedCat: "controller",
  },
  {
    id: "alphapix-flex",
    name: "AlphaPix Flex (AC)",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/AlphaPix-Flex-p/alphapixflex.htm",
    desc: "AC controller for roofline",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["christmas", "both"],
    qty: { small: 0, medium: 1, large: 1 },
    price: 75,
    perUnit: false,
    ownedCat: "controller",
  },
  {
    id: "smart-recv",
    name: "Smart Receiver (4-8 Port)",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/Ready2Run-4-8-SPI-Flex-Long-Range-SMART-Receiver-p/936.htm",
    desc: "Distribute signal across yard",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 2, large: 6 },
    price: 90,
    perUnit: false,
    ownedCat: "controller",
  },
  {
    id: "flex-exp",
    name: "Flex Expansion Board",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/Flex-Long-Range-Differential-Rec",
    desc: "Long range differential receiver",
    tier: "optional",
    exp: ["advanced"],
    space: ["large"],
    budget: ["allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 0, large: 3 },
    price: 60,
    perUnit: false,
    ownedCat: "controller",
  },

  // ─── PIXELS ───
  {
    id: "ws2811",
    name: "WS2811 Bullet Pixels (12mm)",
    vendor: "AliExpress",
    url: "https://www.aliexpress.us/item/3256805086868911.html",
    desc: "Bulk pixels — best value",
    tier: "essential",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 500, medium: 2000, large: 5000 },
    price: 0.08,
    perUnit: true,
    ownedCat: "pixels",
  },
  {
    id: "seed-px",
    name: "Seed / Pebble Pixels",
    vendor: "AliExpress",
    url: "https://www.aliexpress.us/item/3256808393187208.html",
    desc: "Tiny — fence lines and detail",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 500, large: 2000 },
    price: 0.1,
    perUnit: true,
    ownedCat: "pixels",
  },
  {
    id: "seed-strips",
    name: "Seed Pixel Mounting Strips",
    vendor: "Boscoyo Studio",
    url: "https://boscoyostudio.com/products/the-original-mounting-strips-for-seed-pebble-pixels",
    desc: "Clean mount for seed pixels",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 5, large: 20 },
    price: 6,
    perUnit: false,
    ownedCat: "pixels",
  },

  // ─── MATRIX ───
  {
    id: "p5",
    name: "P5 Matrix Panel Kit",
    vendor: "Wired Watts",
    url: "https://www.wiredwatts.com/build-a-matrix-kit",
    desc: "LED matrix — show stealer",
    tier: "optional",
    exp: ["advanced"],
    space: ["medium", "large"],
    budget: ["allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 1, large: 1 },
    price: 400,
    perUnit: false,
    ownedCat: "matrix",
  },
  {
    id: "pixnet",
    name: "PixNode Net",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/PixNode-Net-RGB-Pixel-Node-Mount",
    desc: "Matrix mounting net",
    tier: "optional",
    exp: ["advanced"],
    space: ["medium", "large"],
    budget: ["allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 1, large: 2 },
    price: 30,
    perUnit: false,
    ownedCat: "matrix",
  },

  // ─── POWER ───
  {
    id: "psu350",
    name: "Mean Well LRS-350-12",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/Meanwell-LRS-350-12-12-Volt-350-Watt-Power-Supply-p/47.htm",
    desc: "12V 350W — the standard",
    tier: "essential",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 2, medium: 4, large: 10 },
    price: 25,
    perUnit: false,
    ownedCat: "powersupply",
  },
  {
    id: "fuse-blk",
    name: "Fuse Distribution Block",
    vendor: "Amazon",
    url: "https://www.amazon.com/dp/B07GBV2MHN",
    desc: "Safe power distribution",
    tier: "essential",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 1, medium: 2, large: 6 },
    price: 12,
    perUnit: false,
    ownedCat: "powersupply",
  },
  {
    id: "fuses",
    name: "5 Amp Blade Fuses",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/product-p/875.htm",
    desc: "Always fuse your runs",
    tier: "essential",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 10, medium: 25, large: 50 },
    price: 0.6,
    perUnit: true,
    ownedCat: "powersupply",
  },
  {
    id: "pixaboost",
    name: "PixaBoost Null Pixel",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/Null-Pixel-Amplifier-F-Amp-Booster-PixaBoost-p/748.htm",
    desc: "Signal booster for long runs",
    tier: "optional",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 3, large: 8 },
    price: 8,
    perUnit: false,
    ownedCat: "powersupply",
  },
  {
    id: "psu-mt",
    name: "Dual PSU Mounting Kit",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/Dual-350w-Power-Supply-Mounting-Kit-p/639-kit1.htm",
    desc: "Mount two 350Ws in enclosure",
    tier: "optional",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 1, large: 4 },
    price: 18,
    perUnit: false,
    ownedCat: "powersupply",
  },

  // ─── TREES & STRUCTURE ───
  {
    id: "megatree",
    name: "Steel Mega Tree",
    vendor: "Boscoyo Studio",
    url: "https://boscoyostudio.com/products/steel-megatree-true-topper-46",
    desc: "The centerpiece",
    tier: "essential",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["christmas", "both"],
    qty: { small: 0, medium: 1, large: 1 },
    price: 350,
    perUnit: false,
    ownedCat: "megatree",
  },
  {
    id: "thooks",
    name: "T-Hooks for Mega Tree",
    vendor: "Gilbert Engineering",
    url: "https://gilbertengineeringusa.com/products/t-hooks-for-mega-tree-topper",
    desc: "64-pack for pixel strands",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["christmas", "both"],
    qty: { small: 0, medium: 1, large: 1 },
    price: 35,
    perUnit: false,
    ownedCat: "megatree",
  },
  {
    id: "spiral",
    name: "Spiral Trees",
    vendor: "Gilbert Engineering",
    url: "https://gilbertengineeringusa.com/products/spiral-tree",
    desc: "Elegant yard accents",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["christmas", "both"],
    qty: { small: 0, medium: 4, large: 8 },
    price: 50,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "sm-trees",
    name: "Mini Pixel Trees",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/PixNode-Pixel-Mini-Tree-p/778.htm",
    desc: "Small accent trees",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["solid", "allin"],
    season: ["christmas", "both"],
    qty: { small: 2, medium: 4, large: 6 },
    price: 25,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "px-poles",
    name: "Pixel Poles (NSR)",
    vendor: "EFL Designs",
    url: "https://efl-designs.com/product/pixel-pole-nsr/",
    desc: "Professional pixel poles",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 4, large: 8 },
    price: 35,
    perUnit: false,
    ownedCat: null,
  },

  // ─── ARCHES & EFFECTS ───
  {
    id: "arches",
    name: "Pixel Arches",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/PixNode-Arch-RGB-Pixel-p/pixnodearch.htm",
    desc: "Driveway arches — iconic",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 3, medium: 5, large: 8 },
    price: 30,
    perUnit: false,
    ownedCat: "arches",
  },
  {
    id: "floods",
    name: "Pixel Floods",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/Smart-RGB-Pixel-Flood-p/pixflood.htm",
    desc: "Color wash lighting",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 2, medium: 3, large: 4 },
    price: 20,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "fireworks",
    name: "Firework Bursts",
    vendor: "Gilbert Engineering",
    url: "https://gilbertengineeringusa.com",
    desc: "Starburst effects",
    tier: "optional",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 1, large: 2 },
    price: 80,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "fence",
    name: "Fence Panels",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/PixNode-Fence-RGB-Pixel-p/pixnodefence.htm",
    desc: "Fence line lighting",
    tier: "optional",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 4, large: 7 },
    price: 15,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "px-forest",
    name: "Pixel Forest Stakes",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/Peace-Family-Slim-Pixel-Stakes-F",
    desc: "Slim stakes for pixel forest",
    tier: "optional",
    exp: ["advanced"],
    space: ["large"],
    budget: ["allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 0, large: 2 },
    price: 60,
    perUnit: false,
    ownedCat: null,
  },

  // ─── HOUSE OUTLINE ───
  {
    id: "eaves",
    name: "Eave Pixel Sections",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/PixNode-Eave-RGB-Pixel-p/pixnodeeave.htm",
    desc: "Roofline outline",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["solid", "allin"],
    season: ["christmas", "both"],
    qty: { small: 8, medium: 16, large: 26 },
    price: 8,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "vdrops",
    name: "Vertical Drops",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/PixNode-Vertical-Drop-p/pixnodevdrop.htm",
    desc: "Window/corner accents",
    tier: "optional",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["christmas", "both"],
    qty: { small: 0, medium: 8, large: 15 },
    price: 6,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "wframes",
    name: "Window Frames",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/PixNode-Window-Frame-p/pixnodewf.htm",
    desc: "Pixel window outlines",
    tier: "optional",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["allin"],
    season: ["christmas", "both"],
    qty: { small: 0, medium: 3, large: 5 },
    price: 12,
    perUnit: false,
    ownedCat: null,
  },

  // ─── HALLOWEEN PROPS ───
  {
    id: "spiders",
    name: "GE Preying Spider",
    vendor: "Gilbert Engineering",
    url: "https://gilbertengineeringusa.com/products/preying-spider",
    desc: "350+ pixels — terrifying",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "both"],
    qty: { small: 2, medium: 4, large: 8 },
    price: 65,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "bats",
    name: "GE Bat Props",
    vendor: "Gilbert Engineering",
    url: "https://gilbertengineeringusa.com/products/bat",
    desc: "50 pixels each",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "both"],
    qty: { small: 3, medium: 5, large: 7 },
    price: 25,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "tombstones",
    name: "GE Rosa Tombstones",
    vendor: "Gilbert Engineering",
    url: "https://gilbertengineeringusa.com/products/impression-ge-rosa-tomb",
    desc: "485 pixels — animated",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "both"],
    qty: { small: 0, medium: 2, large: 4 },
    price: 90,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "mini-tomb",
    name: "Mini RIP Tombstones",
    vendor: "EFL Designs",
    url: "https://efl-designs.com/product/tombstone-rip/",
    desc: "Smaller graveyard props",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "both"],
    qty: { small: 2, medium: 4, large: 6 },
    price: 20,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "mini-pump",
    name: "Mini Pumpkins",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/PixNode-Pumpkin-RGB-Pixel-p/pixnodepump.htm",
    desc: "Jack-o-lantern faces",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "both"],
    qty: { small: 3, medium: 5, large: 8 },
    price: 15,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "sing-pump",
    name: "Singing Pumpkin",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/RGB-Singing-Pumpkin-Face-p/17rgb.htm",
    desc: "Animated face — Halloween star",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "both"],
    qty: { small: 0, medium: 1, large: 1 },
    price: 120,
    perUnit: false,
    ownedCat: null,
  },

  // ─── SPINNERS ───
  {
    id: "showstop",
    name: "Showstopper Spinner",
    vendor: "EFL Designs",
    url: "https://efl-designs.com/product/showstopper-spinner/",
    desc: "Multi-ring — mesmerizing",
    tier: "optional",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 1, large: 3 },
    price: 250,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "fuzion",
    name: "GE Fuzion Spinner",
    vendor: "Gilbert Engineering",
    url: "https://gilbertengineeringusa.com/products/fuzion",
    desc: "996 pixels",
    tier: "optional",
    exp: ["advanced"],
    space: ["large"],
    budget: ["allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 0, large: 1 },
    price: 300,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "overlord",
    name: "GE Overlord Spinner",
    vendor: "Gilbert Engineering",
    url: "https://gilbertengineeringusa.com",
    desc: "1,529 pixels — massive",
    tier: "optional",
    exp: ["advanced"],
    space: ["large"],
    budget: ["allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 0, large: 1 },
    price: 400,
    perUnit: false,
    ownedCat: null,
  },

  // ─── CONNECTORS & WIRING ───
  {
    id: "xconn",
    name: "xConnect Extensions",
    vendor: "Gilbert Engineering",
    url: "https://gilbertengineeringusa.com/products/extensions",
    desc: "2-20ft assorted",
    tier: "essential",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 10, medium: 25, large: 50 },
    price: 4,
    perUnit: false,
    ownedCat: "connectors",
  },
  {
    id: "pig-m",
    name: "xConnect Male Pigtails",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/EasyPlug3-Male-Pigtail-xConnect-p/723-m.htm",
    desc: "18AWG heavy duty",
    tier: "essential",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 8, medium: 15, large: 30 },
    price: 3,
    perUnit: false,
    ownedCat: "connectors",
  },
  {
    id: "pig-f",
    name: "xConnect Female Pigtails",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/EasyPlug3-Female-Pigtail-Dangle-xConnect-p/723-f.htm",
    desc: "18AWG heavy duty",
    tier: "essential",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 8, medium: 15, large: 30 },
    price: 3,
    perUnit: false,
    ownedCat: "connectors",
  },
  {
    id: "tsplit",
    name: "xConnect T-Splitters",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/Three-Conductor-Tap-MFF-xConnect-EasyPlug3-p/730.htm",
    desc: "Three-way taps",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 8, large: 20 },
    price: 4,
    perUnit: false,
    ownedCat: "connectors",
  },
  {
    id: "clickits",
    name: "Clickits Splicing",
    vendor: "Experience Lights",
    url: "https://experiencelights.com/clickits-super-fast-pixel-splicing/",
    desc: "Fast pixel splicing",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 30, large: 100 },
    price: 0.5,
    perUnit: true,
    ownedCat: "connectors",
  },
  {
    id: "lv-wire",
    name: "2-Wire LV Wire (500ft)",
    vendor: "Amazon",
    url: "https://www.amazon.com/gp/product/B07Y6NJDQ4",
    desc: "Power injection runs",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 1, large: 1 },
    price: 30,
    perUnit: false,
    ownedCat: "connectors",
  },

  // ─── ENCLOSURES ───
  {
    id: "cg1500",
    name: "CG-1500 Enclosure",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/product-p/554.htm",
    desc: "Medium controller enclosure",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 1, medium: 2, large: 4 },
    price: 45,
    perUnit: false,
    ownedCat: "enclosures",
  },
  {
    id: "hc2500",
    name: "HC-2500 Enclosure",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/HC-2500-Holiday-Lighting-Enclosure-System-p/629.htm",
    desc: "Large — for HinksPix PRO",
    tier: "optional",
    exp: ["advanced"],
    space: ["large"],
    budget: ["allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 0, large: 1 },
    price: 80,
    perUnit: false,
    ownedCat: "enclosures",
  },
  {
    id: "recv-plt",
    name: "Receiver Adapter Plate",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/Flex-Expansion-Long-Range-Receivers-to-CG-1500-p/642-kit1.htm",
    desc: "Mount receivers in enclosures",
    tier: "optional",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 2, large: 4 },
    price: 15,
    perUnit: false,
    ownedCat: "enclosures",
  },

  // ─── TOOLS & MOUNTING ───
  {
    id: "solder",
    name: "Solder Seal Connectors",
    vendor: "Amazon",
    url: "https://www.amazon.com/Connectors-Plustool-Self-Solder-Waterproof-Electrical/dp/B0B18NYX2S",
    desc: "Waterproof heat-shrink",
    tier: "essential",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 50, medium: 100, large: 200 },
    price: 0.1,
    perUnit: true,
    ownedCat: null,
  },
  {
    id: "px-pipe",
    name: "PixelPipe (Pre-drilled)",
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/PixelPipe-Pre-Drilled-Pixel-Mounting-Pipe-p/1800.htm",
    desc: "Black mounting pipe",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 20, large: 40 },
    price: 1.5,
    perUnit: true,
    ownedCat: null,
  },
  {
    id: "mt-rings",
    name: '3/4" Mounting Rings',
    vendor: "Holiday Coro",
    url: "https://www.holidaycoro.com/product-p/655.htm",
    desc: "Pixel mounting clips",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 30, medium: 100, large: 200 },
    price: 0.15,
    perUnit: true,
    ownedCat: null,
  },
  {
    id: "emt",
    name: 'EMT Conduit (1/2", 10ft)',
    vendor: "Home Depot",
    url: "https://www.homedepot.com/p/1-2-in-x-10-ft-Electrical-Metallic-Tubing-EMT-Conduit-0550010000/202068039",
    desc: "Metal conduit for mounting",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 3, medium: 6, large: 10 },
    price: 5,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "pvc",
    name: 'PVC Pipe (3/4", 10ft)',
    vendor: "Home Depot",
    url: "https://www.homedepot.com/p/Charlotte-Pipe-3-4-in-x-10-ft-PVC",
    desc: "For arches and frames",
    tier: "recommended",
    exp: ["beginner", "intermediate", "advanced"],
    space: ["small", "medium", "large"],
    budget: ["starter", "solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 3, medium: 4, large: 6 },
    price: 4,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "grommet",
    name: "Grommet Kit",
    vendor: "Amazon",
    url: "https://www.amazon.com/Grommet-Grommets-Handheld-Manual-Leather/dp/B0D3TCD3W3",
    desc: "With hand tool",
    tier: "optional",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 1, large: 1 },
    price: 18,
    perUnit: false,
    ownedCat: null,
  },
  {
    id: "flanges",
    name: 'Galvanized Flange (2")',
    vendor: "Home Depot",
    url: "https://www.homedepot.com/p/Southland-2-in-Galvanized-Malleable",
    desc: "Pole mounting",
    tier: "recommended",
    exp: ["intermediate", "advanced"],
    space: ["medium", "large"],
    budget: ["solid", "allin"],
    season: ["halloween", "christmas", "both"],
    qty: { small: 0, medium: 4, large: 8 },
    price: 6,
    perUnit: false,
    ownedCat: null,
  },
];

/* ═══════════════════════════════════════════════════════════
   TYPES & CONSTANTS
   ═══════════════════════════════════════════════════════════ */

type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type SpaceSize = "small" | "medium" | "large";
type BudgetTier = "starter" | "solid" | "allin";
type SeasonChoice = "halloween" | "christmas" | "both";

interface WizardState {
  experience: ExperienceLevel | null;
  space: SpaceSize | null;
  budget: BudgetTier | null;
  season: SeasonChoice | null;
  owned: Set<string>;
}

interface ListItemState {
  qty: number;
  removed: boolean;
  isOwned: boolean;
}

interface ListState {
  [productId: string]: ListItemState;
}

const LABELS = {
  experience: {
    beginner: "Beginner",
    intermediate: "Intermediate",
    advanced: "Advanced",
  },
  space: { small: "Small", medium: "Medium", large: "Large" },
  budget: { starter: "$300-800", solid: "$800-2,500", allin: "$2,500+" },
  season: {
    halloween: "Halloween",
    christmas: "Christmas",
    both: "Both Seasons",
  },
};

const STORAGE_KEY = "elmridge-wizard";

/* ═══════════════════════════════════════════════════════════
   STATE ENCODING/DECODING
   ═══════════════════════════════════════════════════════════ */

function encodeState(wizardState: WizardState, listState: ListState): string {
  const data = {
    e: wizardState.experience,
    s: wizardState.space,
    b: wizardState.budget,
    n: wizardState.season,
    o: [...wizardState.owned],
    l: Object.fromEntries(
      Object.entries(listState).map(([id, s]) => [
        id,
        { q: s.qty, r: s.removed ? 1 : 0 },
      ]),
    ),
  };
  return btoa(JSON.stringify(data));
}

function decodeState(
  encoded: string,
): { wizardState: WizardState; listState: ListState } | null {
  try {
    const data = JSON.parse(atob(encoded));
    const wizardState: WizardState = {
      experience: data.e,
      space: data.s,
      budget: data.b,
      season: data.n,
      owned: new Set(data.o || []),
    };
    const listState: ListState = {};
    for (const [id, item] of Object.entries(data.l || {})) {
      const product = PRODUCTS.find((p) => p.id === id);
      if (product) {
        const typedItem = item as { q: number; r: number };
        listState[id] = {
          qty: typedItem.q,
          removed: !!typedItem.r,
          isOwned: product.ownedCat
            ? wizardState.owned.has(product.ownedCat)
            : false,
        };
      }
    }
    return { wizardState, listState };
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */

export default function ShoppingListWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [wizardState, setWizardState] = useState<WizardState>({
    experience: null,
    space: null,
    budget: null,
    season: null,
    owned: new Set(),
  });
  const [listState, setListState] = useState<ListState>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Load state from URL hash or localStorage on mount
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#list=")) {
        const decoded = decodeState(hash.slice(6));
        if (decoded) {
          setWizardState(decoded.wizardState);
          setListState(decoded.listState);
          setShowResults(true);
          return true;
        }
      }
      return false;
    };

    if (handleHash()) return;

    // Try localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const decoded = decodeState(saved);
        if (decoded && decoded.wizardState.experience) {
          setWizardState(decoded.wizardState);
          setListState(decoded.listState);
          setShowResults(true);
        }
      }
    } catch {
      // Silent fail
    }

    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Save to localStorage whenever list changes
  useEffect(() => {
    if (showResults && wizardState.experience) {
      try {
        localStorage.setItem(STORAGE_KEY, encodeState(wizardState, listState));
      } catch {
        // Silent fail
      }
    }
  }, [showResults, wizardState, listState]);

  const showToastMessage = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Generate results from wizard selections
  const generateResults = useCallback(() => {
    if (
      !wizardState.experience ||
      !wizardState.space ||
      !wizardState.budget ||
      !wizardState.season
    )
      return;

    const filtered = PRODUCTS.filter((product) => {
      if (!product.exp.includes(wizardState.experience!)) return false;
      if (!product.space.includes(wizardState.space!)) return false;
      if (!product.budget.includes(wizardState.budget!)) return false;
      if (!product.season.includes(wizardState.season!)) return false;
      const qty = product.qty[wizardState.space!];
      return qty && qty > 0;
    });

    const newListState: ListState = {};
    filtered.forEach((product) => {
      newListState[product.id] = {
        qty: product.qty[wizardState.space!],
        removed: false,
        isOwned: product.ownedCat
          ? wizardState.owned.has(product.ownedCat)
          : false,
      };
    });

    setListState(newListState);
    setShowResults(true);
  }, [wizardState]);

  // Computed values for results
  const activeProducts = useMemo(
    () => PRODUCTS.filter((p) => listState[p.id] && !listState[p.id].removed),
    [listState],
  );
  const removedProducts = useMemo(
    () => PRODUCTS.filter((p) => listState[p.id] && listState[p.id].removed),
    [listState],
  );

  const tiers = useMemo(
    () => ({
      essential: activeProducts.filter((p) => p.tier === "essential"),
      recommended: activeProducts.filter((p) => p.tier === "recommended"),
      optional: activeProducts.filter((p) => p.tier === "optional"),
    }),
    [activeProducts],
  );

  const totals = useMemo(() => {
    let total = 0;
    let itemCount = 0;
    let productCount = 0;
    let ownedCount = 0;

    Object.entries(listState).forEach(([id, state]) => {
      if (state.removed) return;
      const product = PRODUCTS.find((p) => p.id === id);
      if (!product) return;
      if (state.isOwned) {
        ownedCount++;
        return;
      }
      total += product.price * state.qty;
      itemCount += state.qty;
      productCount++;
    });

    return { total, itemCount, productCount, ownedCount };
  }, [listState]);

  // Search results for "Add More Items"
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    return PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.vendor.toLowerCase().includes(query),
    ).slice(0, 8);
  }, [searchQuery]);

  // Actions
  const handleQtyChange = (id: string, delta: number) => {
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product) return;
    const state = listState[id];
    if (!state) return;
    const step = product.perUnit ? Math.max(1, Math.round(state.qty * 0.1)) : 1;
    setListState((prev) => ({
      ...prev,
      [id]: { ...prev[id], qty: Math.max(1, prev[id].qty + delta * step) },
    }));
  };

  const handleRemove = (id: string) => {
    setListState((prev) => ({
      ...prev,
      [id]: { ...prev[id], removed: true },
    }));
  };

  const handleAddBack = (id: string) => {
    setListState((prev) => ({
      ...prev,
      [id]: { ...prev[id], removed: false },
    }));
  };

  const handleAddFromSearch = (id: string) => {
    const product = PRODUCTS.find((p) => p.id === id);
    if (!product || !wizardState.space) return;
    if (!listState[id]) {
      setListState((prev) => ({
        ...prev,
        [id]: {
          qty: product.qty[wizardState.space!] || 1,
          removed: false,
          isOwned: product.ownedCat
            ? wizardState.owned.has(product.ownedCat)
            : false,
        },
      }));
    } else {
      setListState((prev) => ({
        ...prev,
        [id]: { ...prev[id], removed: false },
      }));
    }
    setSearchQuery("");
    showToastMessage(`Added ${product.name}`);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#list=${encodeState(wizardState, listState)}`;
    await navigator.clipboard.writeText(url);
    showToastMessage("Share link copied!");
  };

  const handleCopy = async () => {
    const active = PRODUCTS.filter(
      (p) =>
        listState[p.id] && !listState[p.id].removed && !listState[p.id].isOwned,
    );
    let text = "Shopping List — Lights of Elm Ridge\n\n";
    active.forEach((p) => {
      const state = listState[p.id];
      const price = p.price * state.qty;
      text += `x${state.qty.toLocaleString()} ${p.name} (${p.vendor}) ~$${Math.round(price)}\n`;
    });
    text += `\nEstimated Total: ~$${Math.round(totals.total).toLocaleString()}`;
    await navigator.clipboard.writeText(text);
    showToastMessage("List copied!");
  };

  const handleStartOver = () => {
    setWizardState({
      experience: null,
      space: null,
      budget: null,
      season: null,
      owned: new Set(),
    });
    setListState({});
    setShowResults(false);
    setCurrentStep(1);
    setSearchQuery("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silent
    }
    // Clear hash if present
    if (window.location.hash.startsWith("#list=")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  // Step navigation
  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const updateWizardField = <K extends keyof WizardState>(
    field: K,
    value: WizardState[K],
  ) => {
    setWizardState((prev) => ({ ...prev, [field]: value }));
  };

  const toggleOwned = (cat: string) => {
    setWizardState((prev) => {
      const newOwned = new Set(prev.owned);
      if (newOwned.has(cat)) {
        newOwned.delete(cat);
      } else {
        newOwned.add(cat);
      }
      return { ...prev, owned: newOwned };
    });
  };

  const isNextEnabled = () => {
    switch (currentStep) {
      case 1:
        return !!wizardState.experience;
      case 2:
        return !!wizardState.space;
      case 3:
        return !!wizardState.budget;
      case 4:
        return !!wizardState.season;
      case 5:
        return true;
      default:
        return false;
    }
  };

  // Render wizard steps
  if (!showResults) {
    return (
      <div className="slw">
        {/* Header */}
        <div className="slw-header">
          <h2 className="slw-title">
            Shopping List <span className="slw-accent">Wizard</span>
          </h2>
          <p className="slw-subtitle">
            Answer a few questions, get a personalized gear list. Edit
            quantities, add or remove items, then print or share.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="slw-progress">
          {[1, 2, 3, 4, 5].map((step, idx) => (
            <div key={step} className="slw-progress-step">
              <div
                className={`slw-progress-dot ${step === currentStep ? "active" : ""} ${step < currentStep ? "done" : ""}`}
              >
                {step}
              </div>
              {idx < 4 && (
                <div
                  className={`slw-progress-line ${step < currentStep ? "done" : ""}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Experience */}
        {currentStep === 1 && (
          <div className="slw-step">
            <div className="slw-question">
              What&apos;s your experience level?
            </div>
            <div className="slw-desc">
              Filters out gear you don&apos;t need yet.
            </div>
            <div className="slw-options cols-3">
              {(
                [
                  {
                    value: "beginner",
                    icon: "🌱",
                    title: "Beginner",
                    desc: "First pixel display ever.",
                  },
                  {
                    value: "intermediate",
                    icon: "⚡",
                    title: "Intermediate",
                    desc: "Have pixels, ready to expand.",
                  },
                  {
                    value: "advanced",
                    icon: "🚀",
                    title: "Advanced",
                    desc: "Full show, want upgrades.",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  className={`slw-option ${wizardState.experience === opt.value ? "selected" : ""}`}
                  onClick={() => updateWizardField("experience", opt.value)}
                >
                  <div className="slw-option-icon">{opt.icon}</div>
                  <div className="slw-option-title">{opt.title}</div>
                  <div className="slw-option-desc">{opt.desc}</div>
                </button>
              ))}
            </div>
            <div className="slw-nav">
              <div />
              <button
                className="slw-btn primary"
                disabled={!isNextEnabled()}
                onClick={() => goToStep(2)}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Space */}
        {currentStep === 2 && (
          <div className="slw-step">
            <div className="slw-question">How much space?</div>
            <div className="slw-desc">Determines quantities.</div>
            <div className="slw-options cols-3">
              {[
                {
                  value: "small" as const,
                  icon: "🏡",
                  title: "Small",
                  desc: "Porch or small yard.",
                  note: "",
                },
                {
                  value: "medium" as const,
                  icon: "🏠",
                  title: "Medium",
                  desc: "Suburban, 30-60ft.",
                  note: "",
                },
                {
                  value: "large" as const,
                  icon: "🏰",
                  title: "Large",
                  desc: "Wide lot, 80+ ft.",
                  note: "← That's me",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`slw-option ${wizardState.space === opt.value ? "selected" : ""}`}
                  onClick={() => updateWizardField("space", opt.value)}
                >
                  <div className="slw-option-icon">{opt.icon}</div>
                  <div className="slw-option-title">{opt.title}</div>
                  <div className="slw-option-desc">{opt.desc}</div>
                  {opt.note && (
                    <div className="slw-option-note">{opt.note}</div>
                  )}
                </button>
              ))}
            </div>
            <div className="slw-nav">
              <button className="slw-btn secondary" onClick={() => goToStep(1)}>
                ← Back
              </button>
              <button
                className="slw-btn primary"
                disabled={!isNextEnabled()}
                onClick={() => goToStep(3)}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Budget */}
        {currentStep === 3 && (
          <div className="slw-step">
            <div className="slw-question">Budget range?</div>
            <div className="slw-desc">You can always scale up later.</div>
            <div className="slw-options cols-3">
              {(
                [
                  {
                    value: "starter",
                    icon: "💰",
                    title: "Starter",
                    desc: "$300 – $800",
                    note: "Get your feet wet",
                  },
                  {
                    value: "solid",
                    icon: "💰💰",
                    title: "Solid",
                    desc: "$800 – $2,500",
                    note: "A real show",
                  },
                  {
                    value: "allin",
                    icon: "💰💰💰",
                    title: "All In",
                    desc: "$2,500+",
                    note: "Full production",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  className={`slw-option ${wizardState.budget === opt.value ? "selected" : ""}`}
                  onClick={() => updateWizardField("budget", opt.value)}
                >
                  <div className="slw-option-icon">{opt.icon}</div>
                  <div className="slw-option-title">{opt.title}</div>
                  <div className="slw-option-desc">{opt.desc}</div>
                  {opt.note && (
                    <div className="slw-option-note">{opt.note}</div>
                  )}
                </button>
              ))}
            </div>
            <div className="slw-nav">
              <button className="slw-btn secondary" onClick={() => goToStep(2)}>
                ← Back
              </button>
              <button
                className="slw-btn primary"
                disabled={!isNextEnabled()}
                onClick={() => goToStep(4)}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Season */}
        {currentStep === 4 && (
          <div className="slw-step">
            <div className="slw-question">Which seasons?</div>
            <div className="slw-desc">Determines themed props.</div>
            <div className="slw-options cols-3">
              {[
                {
                  value: "halloween" as const,
                  icon: "🎃",
                  title: "Halloween",
                  desc: "Spooky props and vibes.",
                  note: "",
                },
                {
                  value: "christmas" as const,
                  icon: "🎄",
                  title: "Christmas",
                  desc: "Trees, arches, festive.",
                  note: "",
                },
                {
                  value: "both" as const,
                  icon: "🎃🎄",
                  title: "Both",
                  desc: "Max ROI on pixels.",
                  note: "Recommended",
                },
              ].map((opt) => (
                <button
                  key={opt.value}
                  className={`slw-option ${wizardState.season === opt.value ? "selected" : ""}`}
                  onClick={() => updateWizardField("season", opt.value)}
                >
                  <div className="slw-option-icon">{opt.icon}</div>
                  <div className="slw-option-title">{opt.title}</div>
                  <div className="slw-option-desc">{opt.desc}</div>
                  {opt.note && (
                    <div className="slw-option-note">{opt.note}</div>
                  )}
                </button>
              ))}
            </div>
            <div className="slw-nav">
              <button className="slw-btn secondary" onClick={() => goToStep(3)}>
                ← Back
              </button>
              <button
                className="slw-btn primary"
                disabled={!isNextEnabled()}
                onClick={() => goToStep(5)}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Already Own */}
        {currentStep === 5 && (
          <div className="slw-step">
            <div className="slw-question">What do you already have?</div>
            <div className="slw-desc">
              We&apos;ll mark these on your list. Skip if starting fresh.
            </div>
            <div className="slw-checkboxes">
              {[
                { cat: "controller", label: "A pixel controller" },
                { cat: "pixels", label: "WS2811/WS2812 pixels" },
                { cat: "megatree", label: "A mega tree" },
                { cat: "powersupply", label: "12V power supplies" },
                { cat: "arches", label: "Pixel arches" },
                { cat: "matrix", label: "LED matrix / P5 panels" },
                { cat: "enclosures", label: "Weatherproof enclosures" },
                { cat: "connectors", label: "xConnect connectors" },
              ].map((item) => (
                <button
                  key={item.cat}
                  className={`slw-checkbox ${wizardState.owned.has(item.cat) ? "checked" : ""}`}
                  onClick={() => toggleOwned(item.cat)}
                >
                  <div className="slw-checkbox-box">
                    <span className="slw-checkbox-check">✓</span>
                  </div>
                  <span className="slw-checkbox-label">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="slw-nav">
              <button className="slw-btn secondary" onClick={() => goToStep(4)}>
                ← Back
              </button>
              <button className="slw-btn primary" onClick={generateResults}>
                Build My List →
              </button>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && <div className="slw-toast show">{toast}</div>}
      </div>
    );
  }

  // Render results
  return (
    <div className="slw">
      {/* Results Summary */}
      <div className="slw-results-summary">
        <div className="slw-results-title">Your Custom Shopping List</div>
        <div className="slw-results-subtitle">
          {wizardState.experience && LABELS.experience[wizardState.experience]}{" "}
          · {wizardState.space && LABELS.space[wizardState.space]} ·{" "}
          {wizardState.budget && LABELS.budget[wizardState.budget]} ·{" "}
          {wizardState.season && LABELS.season[wizardState.season]}
        </div>
        <div className="slw-results-stats">
          <div className="slw-stat">
            <span className="slw-stat-num">{totals.productCount}</span> products
          </div>
          <div className="slw-stat">
            <span className="slw-stat-num">
              {totals.itemCount.toLocaleString()}
            </span>{" "}
            items
          </div>
          {totals.ownedCount > 0 && (
            <div className="slw-stat">
              <span className="slw-stat-num">{totals.ownedCount}</span> owned
            </div>
          )}
          {removedProducts.length > 0 && (
            <div className="slw-stat">
              <span className="slw-stat-num">{removedProducts.length}</span>{" "}
              removed
            </div>
          )}
        </div>
      </div>

      {/* Tier Sections */}
      {(["essential", "recommended", "optional"] as const).map((tierKey) => {
        const items = tiers[tierKey];
        if (!items.length) return null;
        const meta = {
          essential: {
            label: "Essential",
            title: "Buy First",
            desc: "You need these",
          },
          recommended: {
            label: "Recommended",
            title: "Buy Next",
            desc: "Build out your show",
          },
          optional: {
            label: "Nice to Have",
            title: "Buy Later",
            desc: "Quality of life",
          },
        }[tierKey];
        return (
          <div key={tierKey} className="slw-tier">
            <div className="slw-tier-header">
              <span className={`slw-tier-badge ${tierKey}`}>{meta.label}</span>
              <span className="slw-tier-title">{meta.title}</span>
              <span className="slw-tier-desc">{meta.desc}</span>
            </div>
            <div className="slw-product-list">
              {items.map((product) => {
                const state = listState[product.id];
                const linePrice = product.price * state.qty;
                return (
                  <div
                    key={product.id}
                    className={`slw-product-row ${state.isOwned ? "excluded" : ""}`}
                  >
                    <div className="slw-product-info">
                      <div className="slw-product-name">{product.name}</div>
                      <div className="slw-product-meta">
                        <span className="slw-product-vendor">
                          {product.vendor}
                        </span>
                        <span className="slw-product-desc">{product.desc}</span>
                      </div>
                    </div>
                    {state.isOwned ? (
                      <span className="slw-owned-badge">✓ Owned</span>
                    ) : (
                      <div className="slw-qty-controls">
                        <button
                          className="slw-qty-btn minus"
                          onClick={() => handleQtyChange(product.id, -1)}
                        >
                          −
                        </button>
                        <div className="slw-qty-value">
                          {state.qty.toLocaleString()}
                        </div>
                        <button
                          className="slw-qty-btn plus"
                          onClick={() => handleQtyChange(product.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    )}
                    <div className="slw-product-price">
                      {!state.isOwned &&
                        `~$${Math.round(linePrice).toLocaleString()}`}
                    </div>
                    <button
                      className="slw-remove-btn"
                      onClick={() => handleRemove(product.id)}
                      title="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Removed Items Tray */}
      {removedProducts.length > 0 && (
        <div className="slw-removed-tray">
          <div className="slw-removed-title">Removed Items</div>
          {removedProducts.map((product) => (
            <div key={product.id} className="slw-removed-item">
              <span className="slw-removed-name">
                {product.name}{" "}
                <span className="slw-removed-vendor">({product.vendor})</span>
              </span>
              <button
                className="slw-add-back-btn"
                onClick={() => handleAddBack(product.id)}
              >
                + Add Back
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add More Items Search */}
      <div className="slw-add-section">
        <div className="slw-add-title">Add More Items</div>
        <input
          type="text"
          className="slw-add-search"
          placeholder="Search all products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchResults.length > 0 && (
          <div className="slw-search-results">
            {searchResults.map((product) => {
              const inList =
                listState[product.id] && !listState[product.id].removed;
              return (
                <div key={product.id} className="slw-search-item">
                  <div>
                    <div className="slw-search-name">{product.name}</div>
                    <div className="slw-search-vendor">{product.vendor}</div>
                  </div>
                  <button
                    className={`slw-search-add ${inList ? "already" : ""}`}
                    onClick={() => !inList && handleAddFromSearch(product.id)}
                    disabled={inList}
                  >
                    {inList ? "In List" : "+ Add"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totals Bar */}
      <div className="slw-totals">
        <div>
          <div className="slw-totals-label">Estimated Total</div>
          <div className="slw-totals-note">Approximate · excludes owned</div>
        </div>
        <div className="slw-totals-right">
          <div className="slw-totals-amount">
            ~${Math.round(totals.total).toLocaleString()}
          </div>
          <div className="slw-totals-items">
            {totals.productCount} products · {totals.itemCount.toLocaleString()}{" "}
            items
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="slw-actions">
        <button className="slw-action-btn" onClick={() => window.print()}>
          Print
        </button>
        <button className="slw-action-btn" onClick={handleCopy}>
          Copy List
        </button>
        <button className="slw-action-btn" onClick={handleShare}>
          Share Link
        </button>
        <button className="slw-action-btn" onClick={handleStartOver}>
          Start Over
        </button>
      </div>

      {/* Disclaimer */}
      <div className="slw-disclaimer">
        Prices approximate as of 2026. Always verify before ordering.
      </div>

      {/* Toast */}
      {toast && <div className="slw-toast show">{toast}</div>}
    </div>
  );
}
