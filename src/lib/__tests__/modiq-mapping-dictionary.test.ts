import { describe, it, expect } from "vitest";
import {
  normalizeName,
  detectVendor,
  buildSessionEvents,
} from "../modiq/mapping-dictionary";

// ─── normalizeName ──────────────────────────────────────────────────

describe("normalizeName", () => {
  it("lowercases and sorts tokens", () => {
    const result = normalizeName("Singing Tree");
    expect(result).toBe("singing_tree");
  });

  it("strips vendor prefixes", () => {
    expect(normalizeName("Boscoyo Singing Tree 180")).toBe("180_singing_tree");
    expect(normalizeName("GE_Rosa_Wreath")).toBe("rosa_wreath");
    expect(normalizeName("PPD Spinner CW")).toBe("cw_spinner");
  });

  it("replaces underscores and dashes with spaces before tokenizing", () => {
    expect(normalizeName("candy-cane_left")).toBe("candy_cane_left");
  });

  it("splits camelCase", () => {
    expect(normalizeName("SingingTree")).toBe("singing_tree");
    expect(normalizeName("MegaTreeRGB")).toBe("mega_tree");
    // RGB is noise, removed
  });

  it("removes noise words (grp, group, rgb, pixel, etc.)", () => {
    expect(normalizeName("Arch Group")).toBe("arch");
    expect(normalizeName("Spinner_RGB_GRP")).toBe("spinner");
    expect(normalizeName("MegaTree_Pixel_180px")).toBe("180_mega_tree");
  });

  it("produces order-independent normalization", () => {
    // Same tokens, different order → same normalized form
    const a = normalizeName("Left Candy Cane");
    const b = normalizeName("Candy Cane Left");
    expect(a).toBe(b);
  });

  it("handles empty and single-token names", () => {
    expect(normalizeName("")).toBe("");
    expect(normalizeName("Arch")).toBe("arch");
  });
});

// ─── detectVendor ───────────────────────────────────────────────────

describe("detectVendor", () => {
  it("detects Boscoyo from name", () => {
    expect(detectVendor("Boscoyo_CandyCane_L")).toBe("Boscoyo Studio");
  });

  it("detects Gilbert Engineering from GE prefix", () => {
    expect(detectVendor("GE_Overlord_Spinner")).toBe("Gilbert Engineering");
  });

  it("detects PPD from name", () => {
    expect(detectVendor("PPD_Wreath_Large")).toBe("Pixel Pro Displays");
  });

  it("detects vendor from folder path", () => {
    expect(detectVendor("Spinner_CW", "/sequences/Boscoyo/2025")).toBe(
      "Boscoyo Studio",
    );
  });

  it("returns null for unknown vendor", () => {
    expect(detectVendor("MyCustomArch")).toBeNull();
  });

  it("detects EFL from name", () => {
    expect(detectVendor("EFL_Snowman_Singing")).toBe("EFL");
  });

  it("detects Xtreme from name", () => {
    expect(detectVendor("Xtreme_MegaTree_16str")).toBe("Xtreme Sequences");
  });
});

// ─── buildSessionEvents ─────────────────────────────────────────────

describe("buildSessionEvents", () => {
  it("identifies auto-confirmed mappings (user kept the auto-match)", () => {
    const original = [
      {
        sourceName: "Arch_Left",
        sourceType: "model",
        sourcePixelCount: 100,
        destName: "Left_Arch",
        destType: "model",
        destPixelCount: 100,
      },
    ];
    const final = [...original]; // user kept it

    const events = buildSessionEvents(original, final);
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("auto_confirmed");
    expect(events[0].source_name).toBe("Arch_Left");
    expect(events[0].dest_name).toBe("Left_Arch");
  });

  it("identifies user corrections (user changed the auto-match)", () => {
    const original = [
      {
        sourceName: "Spinner_CW",
        sourceType: "group",
        sourcePixelCount: 540,
        destName: "Wrong_Match",
        destType: "group",
        destPixelCount: 200,
      },
    ];
    const final = [
      {
        sourceName: "Spinner_CW",
        sourceType: "group",
        sourcePixelCount: 540,
        destName: "SpinnerClockwise",
        destType: "group",
        destPixelCount: 540,
      },
    ];

    const events = buildSessionEvents(original, final);
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("user_correction");
    expect(events[0].dest_name).toBe("SpinnerClockwise");
  });

  it("identifies manual mappings (was unmapped, user created mapping)", () => {
    const original = [
      {
        sourceName: "NewProp_123",
        sourceType: "model",
        sourcePixelCount: 50,
        destName: null,
        destType: "model",
        destPixelCount: null,
      },
    ];
    const final = [
      {
        sourceName: "NewProp_123",
        sourceType: "model",
        sourcePixelCount: 50,
        destName: "My_Custom_Prop",
        destType: "model",
        destPixelCount: 50,
      },
    ];

    const events = buildSessionEvents(original, final);
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe("user_manual");
  });

  it("skips unmapped models in final (no dest_name)", () => {
    const original = [
      {
        sourceName: "Unmapped_Model",
        sourceType: "model",
        sourcePixelCount: 100,
        destName: "Some_Dest",
        destType: "model",
        destPixelCount: 100,
      },
    ];
    const final = [
      {
        sourceName: "Unmapped_Model",
        sourceType: "model",
        sourcePixelCount: 100,
        destName: null,
        destType: "model",
        destPixelCount: null,
      },
    ];

    const events = buildSessionEvents(original, final);
    expect(events).toHaveLength(0);
  });

  it("detects vendor hint from source name", () => {
    const events = buildSessionEvents(
      [],
      [
        {
          sourceName: "Boscoyo_Arch_Left",
          sourceType: "model",
          sourcePixelCount: 100,
          destName: "Arch_L",
          destType: "model",
          destPixelCount: 100,
        },
      ],
    );

    expect(events[0].vendor_hint).toBe("Boscoyo Studio");
  });

  it("uses provided vendor hint over auto-detection", () => {
    const events = buildSessionEvents(
      [],
      [
        {
          sourceName: "Arch_Left",
          sourceType: "model",
          sourcePixelCount: 100,
          destName: "Arch_L",
          destType: "model",
          destPixelCount: 100,
        },
      ],
      "Custom Vendor",
    );

    expect(events[0].vendor_hint).toBe("Custom Vendor");
  });
});
