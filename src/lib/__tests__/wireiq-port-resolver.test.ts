import { describe, it, expect } from "vitest";
import {
  parseStartChannel,
  resolvePortBindings,
} from "@lightsofelmridge/xlights-file-gen/src/parsers/port-resolver";
import type { ParsedModel } from "@lightsofelmridge/xlights-file-gen/src/types/models";
import type { ParsedController } from "@lightsofelmridge/xlights-file-gen/src/types/networks";

// ── Test helpers ──

function makeModel(
  overrides: Partial<ParsedModel> & { name: string },
): ParsedModel {
  return {
    displayAs: "Custom",
    type: "Custom",
    pixelCount: 100,
    parm1: 0,
    parm2: 0,
    parm3: 0,
    stringType: "RGB Nodes",
    startChannel: "",
    worldPosX: 0,
    worldPosY: 0,
    worldPosZ: 0,
    submodels: [],
    isGroup: false,
    aliases: [],
    memberModels: [],
    ...overrides,
  };
}

function makeController(
  overrides: Partial<ParsedController> & { name: string },
): ParsedController {
  return {
    type: "Ethernet",
    ip: "192.168.1.50",
    protocol: "E1.31",
    vendor: "HinksPix",
    model: "PRO V3",
    variant: "",
    active: true,
    autoSize: true,
    autoLayout: true,
    autoUpload: false,
    id: "1",
    description: "",
    startUniverse: 1,
    universeCount: 96,
    channelsPerUniverse: 512,
    totalChannels: 49152,
    fppProxy: "",
    forceLocalIP: "",
    priority: 100,
    portCount: 48,
    maxPixelsPerPort: 1024,
    isReceiver: false,
    dipSwitch: "",
    ...overrides,
  };
}

// ── parseStartChannel tests ──

describe("parseStartChannel", () => {
  describe("bang format (!Controller:port:pixel)", () => {
    it("parses standard bang format", () => {
      const ref = parseStartChannel("!Main Controller:1:1");
      expect(ref.format).toBe("bang");
      expect(ref.controllerName).toBe("Main Controller");
      expect(ref.port).toBe(1);
      expect(ref.startPixel).toBe(1);
    });

    it("parses bang format with high port numbers", () => {
      const ref = parseStartChannel("!HinksPix:48:512");
      expect(ref.format).toBe("bang");
      expect(ref.controllerName).toBe("HinksPix");
      expect(ref.port).toBe(48);
      expect(ref.startPixel).toBe(512);
    });

    it("parses bang format with chained model (not starting at pixel 1)", () => {
      const ref = parseStartChannel("!Main:3:341");
      expect(ref.format).toBe("bang");
      expect(ref.port).toBe(3);
      expect(ref.startPixel).toBe(341);
    });

    it("preserves raw string", () => {
      const ref = parseStartChannel("!Main:1:1");
      expect(ref.raw).toBe("!Main:1:1");
    });
  });

  describe("universe format (>universe:channel)", () => {
    it("parses universe format with > prefix", () => {
      const ref = parseStartChannel(">1:1");
      expect(ref.format).toBe("universe");
      expect(ref.universe).toBe(1);
      expect(ref.channel).toBe(1);
    });

    it("parses high universe numbers", () => {
      const ref = parseStartChannel(">97:256");
      expect(ref.format).toBe("universe");
      expect(ref.universe).toBe(97);
      expect(ref.channel).toBe(256);
    });

    it("parses bare universe format (no > prefix)", () => {
      const ref = parseStartChannel("5:100");
      expect(ref.format).toBe("universe");
      expect(ref.universe).toBe(5);
      expect(ref.channel).toBe(100);
    });
  });

  describe("edge cases", () => {
    it("returns unknown for empty string", () => {
      expect(parseStartChannel("").format).toBe("unknown");
    });

    it("returns unknown for whitespace", () => {
      expect(parseStartChannel("   ").format).toBe("unknown");
    });

    it("returns unknown for unrecognized format", () => {
      expect(parseStartChannel("garbage").format).toBe("unknown");
    });

    it("trims whitespace from input", () => {
      const ref = parseStartChannel("  !Main:1:1  ");
      expect(ref.format).toBe("bang");
      expect(ref.controllerName).toBe("Main");
    });
  });
});

// ── resolvePortBindings tests ──

describe("resolvePortBindings", () => {
  const mainController = makeController({ name: "Main" });

  it("resolves single model on single port", () => {
    const models = [
      makeModel({ name: "Arch 1", pixelCount: 150, startChannel: "!Main:1:1" }),
    ];

    const bindings = resolvePortBindings(models, [mainController]);

    expect(bindings).toHaveLength(1);
    expect(bindings[0].controllerName).toBe("Main");
    expect(bindings[0].port).toBe(1);
    expect(bindings[0].totalPixels).toBe(150);
    expect(bindings[0].models).toHaveLength(1);
    expect(bindings[0].models[0].modelName).toBe("Arch 1");
    expect(bindings[0].models[0].chainOrder).toBe(0);
  });

  it("resolves chained models on same port in correct order", () => {
    const models = [
      makeModel({ name: "Arch 1", pixelCount: 150, startChannel: "!Main:3:1" }),
      makeModel({
        name: "Arch 2",
        pixelCount: 150,
        startChannel: "!Main:3:151",
      }),
      makeModel({
        name: "Arch 3",
        pixelCount: 150,
        startChannel: "!Main:3:301",
      }),
    ];

    const bindings = resolvePortBindings(models, [mainController]);

    expect(bindings).toHaveLength(1);
    const port3 = bindings[0];
    expect(port3.port).toBe(3);
    expect(port3.totalPixels).toBe(450);
    expect(port3.models).toHaveLength(3);
    expect(port3.models[0].modelName).toBe("Arch 1");
    expect(port3.models[0].chainOrder).toBe(0);
    expect(port3.models[1].modelName).toBe("Arch 2");
    expect(port3.models[1].chainOrder).toBe(1);
    expect(port3.models[2].modelName).toBe("Arch 3");
    expect(port3.models[2].chainOrder).toBe(2);
  });

  it("distributes models across multiple ports", () => {
    const models = [
      makeModel({ name: "Arch 1", pixelCount: 150, startChannel: "!Main:1:1" }),
      makeModel({ name: "Tree 1", pixelCount: 500, startChannel: "!Main:2:1" }),
      makeModel({ name: "Star 1", pixelCount: 50, startChannel: "!Main:5:1" }),
    ];

    const bindings = resolvePortBindings(models, [mainController]);

    expect(bindings).toHaveLength(3);
    expect(bindings.find((b) => b.port === 1)?.models[0].modelName).toBe(
      "Arch 1",
    );
    expect(bindings.find((b) => b.port === 2)?.models[0].modelName).toBe(
      "Tree 1",
    );
    expect(bindings.find((b) => b.port === 5)?.models[0].modelName).toBe(
      "Star 1",
    );
  });

  it("resolves models across multiple controllers", () => {
    const receiver = makeController({
      name: "Yard Receiver",
      ip: "192.168.1.51",
      portCount: 16,
      maxPixelsPerPort: 800,
      isReceiver: true,
      startUniverse: 97,
      universeCount: 32,
    });

    const models = [
      makeModel({ name: "Arch 1", pixelCount: 150, startChannel: "!Main:1:1" }),
      makeModel({
        name: "Cane 1",
        pixelCount: 100,
        startChannel: "!Yard Receiver:3:1",
      }),
    ];

    const bindings = resolvePortBindings(models, [mainController, receiver]);

    expect(bindings).toHaveLength(2);
    expect(
      bindings.find((b) => b.controllerName === "Main")?.models[0].modelName,
    ).toBe("Arch 1");
    expect(
      bindings.find((b) => b.controllerName === "Yard Receiver")?.models[0]
        .modelName,
    ).toBe("Cane 1");
  });

  it("calculates utilization percentage", () => {
    const models = [
      makeModel({
        name: "Big Prop",
        pixelCount: 768,
        startChannel: "!Main:1:1",
      }),
    ];

    const bindings = resolvePortBindings(models, [mainController]);

    expect(bindings[0].utilizationPercent).toBe(75); // 768/1024 = 75%
    expect(bindings[0].isOverloaded).toBe(false);
  });

  it("flags overloaded ports", () => {
    const models = [
      makeModel({
        name: "Huge Prop",
        pixelCount: 1100,
        startChannel: "!Main:1:1",
      }),
    ];

    const bindings = resolvePortBindings(models, [mainController]);

    expect(bindings[0].isOverloaded).toBe(true);
    expect(bindings[0].utilizationPercent).toBe(107); // 1100/1024
  });

  it("skips group models", () => {
    const models = [
      makeModel({ name: "Arch 1", pixelCount: 150, startChannel: "!Main:1:1" }),
      makeModel({
        name: "All Arches",
        pixelCount: 0,
        startChannel: "",
        isGroup: true,
      }),
    ];

    const bindings = resolvePortBindings(models, [mainController]);
    expect(bindings).toHaveLength(1);
  });

  it("skips models with 0 pixels", () => {
    const models = [
      makeModel({ name: "Empty", pixelCount: 0, startChannel: "!Main:1:1" }),
    ];

    const bindings = resolvePortBindings(models, [mainController]);
    expect(bindings).toHaveLength(0);
  });

  it("skips models with unparseable StartChannel", () => {
    const models = [
      makeModel({ name: "Bad", pixelCount: 100, startChannel: "garbage" }),
    ];

    const bindings = resolvePortBindings(models, [mainController]);
    expect(bindings).toHaveLength(0);
  });

  it("sorts bindings by controller name then port number", () => {
    const ctrl2 = makeController({ name: "Bravo", ip: "192.168.1.51" });

    const models = [
      makeModel({ name: "M1", pixelCount: 100, startChannel: "!Bravo:2:1" }),
      makeModel({ name: "M2", pixelCount: 100, startChannel: "!Main:5:1" }),
      makeModel({ name: "M3", pixelCount: 100, startChannel: "!Bravo:1:1" }),
      makeModel({ name: "M4", pixelCount: 100, startChannel: "!Main:1:1" }),
    ];

    const bindings = resolvePortBindings(models, [mainController, ctrl2]);

    expect(bindings[0].controllerName).toBe("Bravo");
    expect(bindings[0].port).toBe(1);
    expect(bindings[1].controllerName).toBe("Bravo");
    expect(bindings[1].port).toBe(2);
    expect(bindings[2].controllerName).toBe("Main");
    expect(bindings[2].port).toBe(1);
    expect(bindings[3].controllerName).toBe("Main");
    expect(bindings[3].port).toBe(5);
  });

  it("returns empty array when no models match controllers", () => {
    const models = [
      makeModel({
        name: "Orphan",
        pixelCount: 100,
        startChannel: "!NonExistent:1:1",
      }),
    ];

    const bindings = resolvePortBindings(models, [mainController]);
    expect(bindings).toHaveLength(0);
  });
});
