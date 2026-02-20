import { describe, it, expect } from "vitest";
import { parseNetworksXml } from "@lightsofelmridge/xlights-file-gen/src/parsers/networks-parser";

/** Minimal valid networks XML with a single Ethernet controller */
const SINGLE_CONTROLLER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Networks>
  <Controller type="Ethernet" Name="Main Controller" IP="192.168.1.50"
              Protocol="E131" Vendor="HinksPix" Model="PRO V3"
              Variant="" Active="1" AutoSize="1" AutoLayout="1"
              AutoUpload="0" Id="1" Description="Main show controller">
    <network NetworkType="E131" MaxChannels="512" NumUniverses="96"
             StartUniverse="1" Multicast="0" />
  </Controller>
</Networks>`;

/** Two controllers: a main controller + a differential receiver */
const CONTROLLER_WITH_RECEIVER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Networks>
  <Controller type="Ethernet" Name="Main Controller" IP="192.168.1.50"
              Protocol="E131" Vendor="HinksPix" Model="PRO V3"
              Active="1" AutoSize="1" AutoLayout="1" AutoUpload="0" Id="1">
    <network NetworkType="E131" MaxChannels="510" NumUniverses="96" StartUniverse="1" />
  </Controller>
  <Controller type="Ethernet" Name="Yard Receiver" IP="192.168.1.51"
              Protocol="DDP" Vendor="HinksPix" Model="EasyLights PIX16"
              Active="1" AutoSize="1" AutoLayout="0" AutoUpload="0" Id="2">
    <network NetworkType="DDP" MaxChannels="510" NumUniverses="32" StartUniverse="97" />
  </Controller>
</Networks>`;

/** Multiple controllers including Falcon hardware */
const MULTI_CONTROLLER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Networks>
  <Controller type="Ethernet" Name="Main" IP="192.168.1.50"
              Protocol="E131" Vendor="HinksPix" Model="PRO V3"
              Active="1" AutoSize="1" AutoLayout="1" AutoUpload="0" Id="1">
    <network MaxChannels="512" NumUniverses="96" StartUniverse="1" />
  </Controller>
  <Controller type="Ethernet" Name="Falcon" IP="192.168.1.60"
              Protocol="E131" Vendor="Falcon" Model="F48"
              Active="1" AutoSize="0" AutoLayout="0" AutoUpload="0" Id="2">
    <network MaxChannels="512" NumUniverses="48" StartUniverse="97" />
  </Controller>
  <Controller type="Ethernet" Name="WLED Tree" IP="192.168.1.70"
              Protocol="DDP" Vendor="WLED" Model="ESP32 (WLED)"
              Active="1" AutoSize="1" AutoLayout="1" AutoUpload="0" Id="3">
    <network MaxChannels="512" NumUniverses="2" StartUniverse="145" />
  </Controller>
</Networks>`;

/** Controller with Null type (should be skipped) */
const WITH_NULL_CONTROLLER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Networks>
  <Controller type="Null" Name="Placeholder" Active="0" Id="99" />
  <Controller type="Ethernet" Name="Active" IP="192.168.1.50"
              Protocol="E131" Vendor="Falcon" Model="F16V4"
              Active="1" Id="1">
    <network MaxChannels="512" NumUniverses="16" StartUniverse="1" />
  </Controller>
</Networks>`;

/** Controller with inactive state */
const INACTIVE_CONTROLLER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Networks>
  <Controller type="Ethernet" Name="Disabled Box" IP="192.168.1.99"
              Protocol="E131" Vendor="HinksPix" Model="PRO V3"
              Active="0" AutoSize="0" AutoLayout="0" AutoUpload="0" Id="5">
    <network MaxChannels="512" NumUniverses="96" StartUniverse="1" />
  </Controller>
</Networks>`;

describe("parseNetworksXml", () => {
  describe("basic parsing", () => {
    it("parses a single Ethernet controller", () => {
      const result = parseNetworksXml(SINGLE_CONTROLLER_XML);

      expect(result.controllers).toHaveLength(1);
      expect(result.totalControllers).toBe(1);
      expect(result.totalReceivers).toBe(0);
      expect(result.fileName).toBe("xlights_networks.xml");

      const ctrl = result.controllers[0];
      expect(ctrl.name).toBe("Main Controller");
      expect(ctrl.type).toBe("Ethernet");
      expect(ctrl.ip).toBe("192.168.1.50");
      expect(ctrl.protocol).toBe("E1.31");
      expect(ctrl.vendor).toBe("HinksPix");
      expect(ctrl.model).toBe("PRO V3");
      expect(ctrl.active).toBe(true);
      expect(ctrl.autoSize).toBe(true);
      expect(ctrl.autoLayout).toBe(true);
      expect(ctrl.autoUpload).toBe(false);
      expect(ctrl.id).toBe("1");
      expect(ctrl.description).toBe("Main show controller");
    });

    it("resolves port count and max pixels from controller database", () => {
      const result = parseNetworksXml(SINGLE_CONTROLLER_XML);
      const ctrl = result.controllers[0];

      // HinksPix PRO V3 = 48 ports, 1024 max pixels per port
      expect(ctrl.portCount).toBe(48);
      expect(ctrl.maxPixelsPerPort).toBe(1024);
    });

    it("parses network/universe configuration", () => {
      const result = parseNetworksXml(SINGLE_CONTROLLER_XML);
      const ctrl = result.controllers[0];

      expect(ctrl.startUniverse).toBe(1);
      expect(ctrl.universeCount).toBe(96);
      expect(ctrl.channelsPerUniverse).toBe(512);
      expect(ctrl.totalChannels).toBe(96 * 512);
    });

    it("accepts custom file name", () => {
      const result = parseNetworksXml(SINGLE_CONTROLLER_XML, "my-networks.xml");
      expect(result.fileName).toBe("my-networks.xml");
    });
  });

  describe("receiver detection", () => {
    it("detects differential receivers", () => {
      const result = parseNetworksXml(CONTROLLER_WITH_RECEIVER_XML);

      expect(result.controllers).toHaveLength(2);
      expect(result.totalControllers).toBe(1);
      expect(result.totalReceivers).toBe(1);

      const main = result.controllers[0];
      const receiver = result.controllers[1];

      expect(main.isReceiver).toBe(false);
      expect(receiver.isReceiver).toBe(true);
      expect(receiver.name).toBe("Yard Receiver");
      expect(receiver.model).toBe("EasyLights PIX16");
    });
  });

  describe("multiple controllers", () => {
    it("parses multiple controllers with different vendors", () => {
      const result = parseNetworksXml(MULTI_CONTROLLER_XML);

      expect(result.controllers).toHaveLength(3);
      expect(result.totalControllers).toBe(3);
      expect(result.totalReceivers).toBe(0);

      // Verify each controller
      expect(result.controllers[0].vendor).toBe("HinksPix");
      expect(result.controllers[0].portCount).toBe(48);

      expect(result.controllers[1].vendor).toBe("Falcon");
      expect(result.controllers[1].model).toBe("F48");
      expect(result.controllers[1].portCount).toBe(48);

      expect(result.controllers[2].vendor).toBe("WLED");
      expect(result.controllers[2].protocol).toBe("DDP");
    });

    it("calculates total universes across all controllers", () => {
      const result = parseNetworksXml(MULTI_CONTROLLER_XML);
      expect(result.totalUniverses).toBe(96 + 48 + 2);
    });

    it("calculates total channels across all controllers", () => {
      const result = parseNetworksXml(MULTI_CONTROLLER_XML);
      expect(result.totalChannels).toBe((96 + 48 + 2) * 512);
    });
  });

  describe("edge cases", () => {
    it("skips Null controllers", () => {
      const result = parseNetworksXml(WITH_NULL_CONTROLLER_XML);
      expect(result.controllers).toHaveLength(1);
      expect(result.controllers[0].name).toBe("Active");
    });

    it("parses inactive controllers with active=false", () => {
      const result = parseNetworksXml(INACTIVE_CONTROLLER_XML);
      expect(result.controllers).toHaveLength(1);
      expect(result.controllers[0].active).toBe(false);
    });

    it("throws on invalid XML", () => {
      expect(() => parseNetworksXml("<not valid xml><<>>")).toThrow(
        "Invalid XML",
      );
    });

    it("handles empty Networks element", () => {
      const result = parseNetworksXml(
        '<?xml version="1.0"?><Networks></Networks>',
      );
      expect(result.controllers).toHaveLength(0);
      expect(result.totalControllers).toBe(0);
    });

    it("infers port count from model name when not in DB", () => {
      const xml = `<?xml version="1.0"?>
        <Networks>
          <Controller type="Ethernet" Name="Unknown" IP="10.0.0.1"
                      Protocol="E131" Vendor="NewVendor" Model="PixController32"
                      Active="1" Id="1">
            <network MaxChannels="512" NumUniverses="32" StartUniverse="1" />
          </Controller>
        </Networks>`;
      const result = parseNetworksXml(xml);
      expect(result.controllers[0].portCount).toBe(32);
    });
  });

  describe("protocol normalization", () => {
    it("normalizes E131 to E1.31", () => {
      const result = parseNetworksXml(SINGLE_CONTROLLER_XML);
      expect(result.controllers[0].protocol).toBe("E1.31");
    });

    it("normalizes DDP protocol", () => {
      const result = parseNetworksXml(CONTROLLER_WITH_RECEIVER_XML);
      const receiver = result.controllers.find(
        (c) => c.name === "Yard Receiver",
      );
      expect(receiver?.protocol).toBe("DDP");
    });
  });
});
