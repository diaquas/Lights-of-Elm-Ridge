# Wire:IQ — System Wiring Diagram Generator

## Design Document v1.0

**Status:** Approved for implementation
**Author:** Claude Code
**Date:** 2026-02-20
**Route:** `/wireiq`

---

## 1. Product Vision

Wire:IQ is a dedicated wiring diagram generator that takes a user's xLights configuration files and produces a clear, interactive visualization of their entire display's wiring topology. It answers the question every new display builder asks: **"How the hell am I going to wire all of this stuff I just bought up?"**

### What It Is

- A niche, purpose-built wiring diagram tool for xLights pixel displays
- Imports `xlights_rgbeffects.xml` (models/props) and `xlights_networks.xml` (controllers/networks)
- Generates a complete wiring visualization: ethernet, data, power, and injection points
- Read-only initially, architected for future drag-and-drop repositioning
- Part of the IQ tool series alongside Mod:IQ, Beat:IQ, Lyr:IQ, Trk:IQ

### What It Is Not

- Not Miro or a general-purpose diagramming tool
- Not a pixel-level wiring view (xLights already has that per-prop)
- Not a CAD tool — it's focused on clarity and accessibility for newbies

### Why It Matters

- No tool like this exists in the xLights ecosystem (confirmed by [xLights Issue #3870](https://github.com/xLightsSequencer/xLights/issues/3870))
- Wiring is the #1 frustration for new display builders
- Bridges the gap between "I bought all this stuff" and "I know how to connect it"
- Feeds into the forthcoming Shopping List 2.0 / Bill of Materials feature

---

## 2. Data Sources — What We Parse

### 2.1 `xlights_rgbeffects.xml` (Already Parsed)

The existing `parseRgbEffectsXml()` in `src/lib/modiq/parser.ts` already extracts:

| Field | Usage in Wire:IQ |
|-------|-----------------|
| `name` | Prop label on diagram |
| `displayAs` / `type` | Icon selection, grouping |
| `pixelCount` | Port budget calculation, power calc |
| `startChannel` | Controller/port assignment derivation |
| `stringType` | Pixel type (WS2811, WS2812B, etc.) for power specs |
| `parm1/parm2/parm3` | String count for multi-string props |
| `worldPosX/Y/Z` | Spatial positioning hints for layout |

### 2.2 `xlights_networks.xml` (New Parser Required)

This file contains the controller/network configuration. We need a new parser.

**XML Structure:**

```xml
<Networks>
  <Controller type="Ethernet" Name="Main Controller" IP="192.168.1.50"
              Protocol="E131" Vendor="HinksPix" Model="PRO V3"
              Variant="" Active="1" AutoSize="1" AutoLayout="1"
              AutoUpload="0" Id="1">
    <network NetworkType="E131" ComPort="" BaudRate=""
             MaxChannels="512" NumUniverses="96"
             StartUniverse="1" Multicast="0" />
  </Controller>
  <Controller type="Ethernet" Name="Yard Receiver" IP="192.168.1.51"
              Protocol="DDP" Vendor="HinksPix" Model="EasyLights PIX16"
              Variant="" Active="1" AutoSize="1" ...>
    <network ... />
  </Controller>
</Networks>
```

**Key data to extract:**

```typescript
interface ParsedController {
  name: string;
  type: "Ethernet" | "Serial" | "Null";
  ip: string;
  protocol: string;        // E131, ArtNet, DDP, ZCPP
  vendor: string;
  model: string;
  variant: string;
  active: boolean;
  autoSize: boolean;
  autoLayout: boolean;
  id: string;
  // Network config
  startUniverse: number;
  universeCount: number;
  channelsPerUniverse: number;
  totalChannels: number;
  // Derived
  portCount: number;       // From CONTROLLER_DB lookup
  maxPixelsPerPort: number; // From CONTROLLER_DB lookup
}
```

### 2.3 Deriving Port Assignments

xLights doesn't store explicit "port X → model Y" in a single place. Port assignments are derived from:

1. **Model's `StartChannel`** format: `!ControllerName:port:startPixel` or `>universe:channel`
2. **Controller Visualizer data** (if present in rgbeffects or controller config)
3. **Auto-layout** — xLights assigns models to ports in order of channel address

The `StartChannel` attribute is the primary source. Common formats:
- `!Main Controller:1:1` → Controller "Main Controller", Port 1, starting at pixel 1
- `!Main Controller:3:341` → Port 3, starting at pixel 341 (chained after 340 pixels)
- `>1:1` → Universe 1, Channel 1 (older format, requires universe-to-port mapping)

**Parser logic:**
```typescript
function parseStartChannel(startChannel: string, controllers: ParsedController[]): PortBinding | null {
  // Format: !ControllerName:port:startPixel
  const bangMatch = startChannel.match(/^!(.+):(\d+):(\d+)$/);
  if (bangMatch) {
    return {
      controllerName: bangMatch[1],
      port: parseInt(bangMatch[2]),
      startPixel: parseInt(bangMatch[3]),
    };
  }

  // Format: >universe:channel (derive controller from universe range)
  const universeMatch = startChannel.match(/^>(\d+):(\d+)$/);
  if (universeMatch) {
    const universe = parseInt(universeMatch[1]);
    const channel = parseInt(universeMatch[2]);
    return derivePortFromUniverse(universe, channel, controllers);
  }

  return null;
}
```

### 2.4 Deriving Differential Receiver / Remote Receiver Info

Differential receivers (like HinksPix EasyLights PIX16, Falcon Smart Receiver) appear as separate controllers in `xlights_networks.xml` with their own IP. They connect to the main controller via ethernet and fan out to local props.

Detection heuristic:
- Controller model contains "receiver", "PIX16", "EasyLights", "Smart Receiver", etc.
- Or: controller has DDP protocol with a small port count (4-16) relative to a main controller with many ports

We'll maintain a lookup table of known receiver models.

---

## 3. Architecture

### 3.1 System Layers

```
┌─────────────────────────────────────────────────────┐
│  UI Layer — React Flow Diagram + Controls           │
│  @xyflow/react + Custom Nodes + Tailwind            │
├─────────────────────────────────────────────────────┤
│  Layout Engine — ELK.js Auto-Layout                 │
│  elkjs — Port-aware hierarchical layout             │
├─────────────────────────────────────────────────────┤
│  Transform Layer — Data → React Flow Nodes/Edges    │
│  src/lib/wireiq/diagram-transformer.ts              │
├─────────────────────────────────────────────────────┤
│  Wire:IQ Engine — @lightsofelmridge/xwire           │
│  Power calc, cable routing, port assignment, BOM    │
├─────────────────────────────────────────────────────┤
│  Parser Layer — @lightsofelmridge/xlights-file-gen  │
│  rgbeffects parser + NEW networks parser            │
└─────────────────────────────────────────────────────┘
```

### 3.2 Package Responsibilities

**`@lightsofelmridge/xlights-file-gen`** (existing package — extend):
- **NEW:** `parseNetworksXml(xml: string): ParsedNetworkConfig`
- **NEW:** `derivePortAssignments(models: ParsedModel[], controllers: ParsedController[]): PortBinding[]`
- Existing: `parseRgbEffectsXml()` (already complete)

**`@lightsofelmridge/xwire`** (existing scaffold — implement):
- `calculatePowerPlan(layout, controllers): PowerPlan` — voltage drop, PSU sizing
- `calculateInjectionPoints(cableRuns, pixelSpecs): InjectionPoint[]` — power injection recommendations
- `assignPorts(models, controller): PortAssignment[]` — if not already assigned in XML
- `generateBillOfMaterials(plan): BomItem[]` — cable lengths, connectors, fuses

**`src/lib/wireiq/`** (new — app-level engine):
- `diagram-transformer.ts` — Convert `WiringPlan` → React Flow nodes/edges
- `layout-engine.ts` — ELK.js integration for auto-positioning
- `power-rules.ts` — Power injection rule engine (when/where to inject)
- `types.ts` — Wire:IQ-specific types

**`src/components/wireiq/`** (new — UI components):
- Custom React Flow nodes (Controller, Receiver, Prop, PSU, InjectionPoint)
- Custom React Flow edges (Ethernet, Data, Power, Injection)
- Import panel, legend, stats sidebar

### 3.3 Data Flow

```
User uploads 2 XML files
          │
          ▼
┌─────────────────────────┐
│ parseRgbEffectsXml()    │──▶ ParsedLayout (models, pixels, positions)
│ parseNetworksXml()      │──▶ ParsedNetworkConfig (controllers, universes)
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ derivePortAssignments() │──▶ PortBinding[] (model → controller:port)
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ xwire engines           │
│  calculatePowerPlan()   │──▶ PowerPlan (PSU sizing, voltage drop)
│  calcInjectionPoints()  │──▶ InjectionPoint[] (recommended injections)
│  generateBOM()          │──▶ BomItem[] (shopping list) ← Shopping List 2.0 hook
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ diagramTransformer()    │──▶ { nodes: Node[], edges: Edge[] }
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ elkLayout()             │──▶ positioned nodes with x,y coordinates
└─────────────────────────┘
          │
          ▼
┌─────────────────────────┐
│ React Flow <ReactFlow>  │──▶ Interactive rendered diagram
└─────────────────────────┘
```

---

## 4. Diagram Design

### 4.1 Node Types

#### Controller Node
```
┌─────────────────────────────────────┐
│  🔲 HinksPix PRO V3                │
│  192.168.1.50  •  E1.31             │
│  DIP: 001                           │
├─────────────────────────────────────┤
│  P1  ●──  340px │ P25 ●──  200px   │
│  P2  ●──  340px │ P26 ●──  200px   │
│  P3  ●──  400px │ P27 ●──   50px   │
│  ...            │ ...               │
│  P24 ●──  150px │ P48 ●──    0     │
├─────────────────────────────────────┤
│  Total: 8,240px / 49,152 max       │
│  ██████████░░░░░░░░░░░░░░ 16.8%    │
└─────────────────────────────────────┘
```

- Header: vendor/model, IP, protocol, DIP switch setting
- Port grid: each port is a React Flow Handle with pixel count
- Ports color-coded by utilization (green < 75%, yellow 75-90%, red > 90%)
- Footer: total pixel utilization bar

#### Receiver Node
```
┌──────────────────────────────────┐
│  📡 Yard Receiver                │
│  EasyLights PIX16 • DIP: 003    │
│  192.168.1.52                    │
├──────────────────────────────────┤
│  ⬤ ETH IN                       │
├──────────────────────────────────┤
│  P1  ●──  150px                  │
│  P2  ●──  200px                  │
│  ...                             │
│  P16 ●──  100px                  │
├──────────────────────────────────┤
│  Total: 2,400px / 12,800 max    │
└──────────────────────────────────┘
```

- Ethernet input handle at top
- Port handles along side(s)
- DIP switch setting prominently displayed

#### Prop Node (Compact)
```
┌──────────────────────┐
│  ⬤ Arch 1            │
│  150px • WS2811 12V  │
└──────────────────────┘
```

- Single input handle (data from controller port)
- Name, pixel count, pixel type
- Optional: stacked when multiple props chain on one port

#### Prop Stack (Chained Props on One Port)
```
Port 3 ──────┐
             ▼
     ┌──────────────────┐
     │ Arch 1  (150px)  │ ← first in chain
     │ Arch 2  (150px)  │
     │ Arch 3  (150px)  │
     ├──────────────────┤
     │ Total: 450 / 1024│
     └──────────────────┘
```

When multiple models share a port (chained), they display as a stacked card showing the chain order (critical for physical wiring).

#### Power Supply Node
```
┌──────────────────────────┐
│  ⚡ PSU-1                 │
│  12V  •  350W  •  29.2A  │
│  ████████████░░░░ 68%    │
│  Powers: Main Controller  │
└──────────────────────────┘
```

#### Ethernet Switch Node
```
┌──────────────────────────┐
│  🔀 Network Switch        │
│  8-Port Gigabit           │
│  P1 ● P2 ● P3 ● ... P8 ●│
└──────────────────────────┘
```

#### Power Injection Point (Inline Marker)
```
      ◆ Inject 12V @ pixel 200
      │ Reason: Voltage drop > 10%
      │ Fuse: 10A
```

Rendered as a diamond marker on the cable run edge, with a tooltip showing details.

### 4.2 Edge Types (Wire Types)

| Edge Type | Color | Style | Label |
|-----------|-------|-------|-------|
| **Ethernet** | `#3B82F6` (blue-500) | Solid, thick (3px) | IP/subnet |
| **Pixel Data** | `#F59E0B` (amber-500) | Solid, medium (2px) | Port # → Model chain |
| **Power (main)** | `#EF4444` (red-500) | Solid, thick (3px) | Voltage, gauge |
| **Power Injection** | `#F97316` (orange-500) | Dashed, medium (2px) | Inject point, fuse |
| **Ground** | `#6B7280` (gray-500) | Dotted, thin (1px) | — |

Edges use React Flow's `smoothstep` or `bezier` path type for clean routing. Custom edge components render the color and style per type.

### 4.3 Layout Strategy

**Primary layout: ELK.js layered algorithm**

```
Layer 0: Ethernet Switch
Layer 1: Controllers (main)
Layer 2: Receivers (differential)
Layer 3: Props (grouped by port)
```

ELK configuration:
```typescript
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",           // Top-to-bottom flow
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
  "elk.layered.spacing.edgeNodeBetweenLayers": "50",
  "elk.portConstraints": "FIXED_ORDER",  // Respect port ordering
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
};
```

**Future: User repositioning**
- React Flow's `onNodeDragStop` captures new positions
- Positions saved to localStorage or Supabase session
- "Reset Layout" button re-runs ELK auto-layout

### 4.4 Diagram Views / Modes

The diagram supports toggling between focused views:

| View | Shows | Hides |
|------|-------|-------|
| **Full System** (default) | Everything | Nothing |
| **Data Network** | Ethernet switch, controllers, receivers, ethernet edges | Power, injection |
| **Port Wiring** | Controllers, receivers, props, data edges | Ethernet switch, power |
| **Power Plan** | PSUs, controllers, power edges, injection points | Ethernet, data |

Implemented via React Flow's `hidden` node/edge property and a view toggle in the toolbar.

---

## 5. UI Design

### 5.1 Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│  Wire:IQ — Wiring Diagram Generator            [View ▾] [⚙]  │
├────────────────────────────────────────────────────────────────┤
│                                                    ┌─────────┐│
│                                                    │ Legend   ││
│                                                    │─────────││
│          ┌────────────────────────────┐            │ ── ETH  ││
│          │                            │            │ ── Data  ││
│          │     React Flow Canvas      │            │ ── Power ││
│          │     (zoomable, pannable)   │            │ ── Inject││
│          │                            │            │─────────││
│          │                            │            │ Stats   ││
│          │                            │            │ 12,400px││
│          │                            │            │ 8 ctrls ││
│          └────────────────────────────┘            │ 3 PSUs  ││
│                                                    └─────────┘│
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Minimap                                                  │ │
│  └──────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────┤
│  [Export PNG]  [Export PDF]  [Shopping List →]  [Save Session] │
└────────────────────────────────────────────────────────────────┘
```

### 5.2 Import Flow

1. **Landing state**: Upload panel with two file drop zones
   - Drop zone 1: `xlights_rgbeffects.xml` (models/props)
   - Drop zone 2: `xlights_networks.xml` (controllers/networks)
   - Both required before "Generate Diagram" is enabled
2. **Processing**: Parse both files, derive port assignments, run power calculations
3. **Diagram**: Full interactive diagram with all controls

### 5.3 Toolbar Controls

- **View mode toggle**: Full System / Data Network / Port Wiring / Power Plan
- **Zoom controls**: +, -, Fit to screen (React Flow built-in)
- **Search**: Find a specific model or controller in the diagram (centers view)
- **Filter**: Show/hide by controller, by prop type, by port utilization level
- **Export**: PNG screenshot, PDF export
- **Shopping List**: Link to Shopping List 2.0 (passes BOM data)

### 5.4 Interaction Patterns

**Hover**: Tooltip with full details for any node or edge
**Click**: Select node/edge, highlight connected nodes/edges (dim others)
**Right-click**: Context menu (future: edit properties, add note)
**Keyboard**:
- `F` — Fit to view
- `1/2/3/4` — Switch view modes
- `Ctrl+F` — Search
- `Escape` — Deselect

---

## 6. Power Injection Engine

### 6.1 When to Recommend Injection

Power injection rules based on pixel type and run length:

| Pixel Type | Voltage | Inject After | Then Every |
|------------|---------|-------------|------------|
| WS2811 | 12V | 200 pixels | 300 pixels |
| WS2811 | 5V | 75 pixels | 100 pixels |
| WS2812B | 5V | 50 pixels | 75 pixels |
| WS2815 | 12V | 200 pixels | 300 pixels |
| SK6812 | 5V | 50 pixels | 75 pixels |

These are conservative recommendations. The actual calculation uses voltage drop analysis:

```
V_drop = I_total × R_wire × length
Where:
  I_total = pixelCount × ampsPerPixel (from PIXEL_POWER_SPECS)
  R_wire = resistancePerFoot (from WIRE_GAUGE_TABLE)
  length = cable length in feet
```

**Injection recommended when**: `V_drop > 10%` of supply voltage

### 6.2 Power Supply Sizing

```
Required watts = totalPixels × wattsPerPixel × safetyFactor
Where:
  safetyFactor = 1.25 (25% headroom, industry standard)
```

PSU recommendations:
- Never exceed 80% of rated capacity
- Group props by physical location for PSU assignment
- Recommend commonly available sizes: 100W, 200W, 350W, 500W

---

## 7. Implementation Plan

### Phase 1: Foundation (Parser + Types)

**Files to create/modify:**

1. `packages/xlights-file-gen/src/parsers/networks-parser.ts` — NEW
   - `parseNetworksXml(xml: string): ParsedNetworkConfig`
   - Parse `<Controller>` elements with all attributes
   - Parse `<network>` child elements for universe config
   - Cross-reference with `CONTROLLER_DB` for port specs

2. `packages/xlights-file-gen/src/parsers/port-resolver.ts` — NEW
   - `resolvePortBindings(models: ParsedModel[], controllers: ParsedController[]): PortBinding[]`
   - Parse `StartChannel` attribute (`!Controller:port:pixel` format)
   - Derive chain order within each port
   - Handle universe-based format (`>universe:channel`)

3. `packages/xlights-file-gen/src/types/networks.ts` — NEW
   - `ParsedController`, `ParsedNetworkConfig`, `PortBinding`, `ControllerPort`

4. Update `packages/xlights-file-gen/src/index.ts` — Add new exports

5. Tests:
   - `packages/xlights-file-gen/src/__tests__/networks-parser.test.ts`
   - `packages/xlights-file-gen/src/__tests__/port-resolver.test.ts`

### Phase 2: Wire:IQ Engine (xwire package)

**Implement the existing stubs:**

1. `packages/xwire/src/engine/power-calculator.ts` — IMPLEMENT
   - Voltage drop calculation per cable run
   - PSU sizing and assignment
   - Per-port power analysis

2. `packages/xwire/src/engine/port-assigner.ts` — IMPLEMENT
   - Validate parsed port assignments
   - Flag overloaded ports (pixels > max)
   - Suggest rebalancing when ports are overloaded

3. `packages/xwire/src/engine/cable-router.ts` — IMPLEMENT
   - Calculate cable lengths from controller/receiver positions to props
   - Use world positions from XML as distance hints
   - Determine wire gauge recommendations based on amperage

4. `packages/xwire/src/engine/injection-calculator.ts` — NEW
   - Dedicated injection point calculator
   - Apply voltage drop rules per pixel type
   - Return injection points with pixel index, voltage, reason

5. `packages/xwire/src/engine/bill-of-materials.ts` — IMPLEMENT
   - Aggregate cable lengths by gauge
   - Count connectors, fuses, enclosures
   - Produce itemized BOM for Shopping List 2.0

6. Update `packages/xwire/src/types/wiring.ts` — Extend with new types

7. Tests for each engine module

### Phase 3: Diagram Transformer + Layout

**App-level engine code:**

1. `src/lib/wireiq/types.ts` — NEW
   - `WireIQNode`, `WireIQEdge`, `DiagramConfig`, view mode types

2. `src/lib/wireiq/diagram-transformer.ts` — NEW
   - `transformToReactFlow(plan: WiringPlan, portBindings: PortBinding[]): { nodes, edges }`
   - Create Controller nodes with port handles
   - Create Receiver nodes with ethernet input + port handles
   - Create Prop nodes/stacks grouped by port
   - Create PSU nodes
   - Create Ethernet, Data, Power, and Injection edges
   - Apply color coding and styling per edge type

3. `src/lib/wireiq/layout-engine.ts` — NEW
   - `calculateLayout(nodes, edges): Promise<PositionedNodes>`
   - ELK.js integration with port-aware layered layout
   - Configurable direction and spacing

4. `src/lib/wireiq/power-rules.ts` — NEW
   - Injection point rule definitions
   - Pixel type → injection threshold lookup
   - Voltage drop formula implementation

5. Tests for transformer and layout

### Phase 4: UI Components

**React Flow custom nodes:**

1. `src/components/wireiq/nodes/ControllerNode.tsx` — NEW
   - Renders controller box with header, port grid, utilization bar
   - Ports are React Flow Handles
   - Color-coded port indicators

2. `src/components/wireiq/nodes/ReceiverNode.tsx` — NEW
   - Ethernet input handle, port handles, DIP switch display

3. `src/components/wireiq/nodes/PropNode.tsx` — NEW
   - Compact prop card with pixel count and type

4. `src/components/wireiq/nodes/PropStackNode.tsx` — NEW
   - Stacked card for chained props on a single port
   - Shows chain order (critical for physical wiring)

5. `src/components/wireiq/nodes/PowerSupplyNode.tsx` — NEW
   - PSU card with voltage, wattage, utilization gauge

6. `src/components/wireiq/nodes/EthernetSwitchNode.tsx` — NEW
   - Network switch with port handles

7. `src/components/wireiq/nodes/InjectionMarkerNode.tsx` — NEW
   - Diamond-shaped injection point on cable runs

**React Flow custom edges:**

8. `src/components/wireiq/edges/EthernetEdge.tsx` — NEW (blue, solid, thick)
9. `src/components/wireiq/edges/DataEdge.tsx` — NEW (amber, solid, medium)
10. `src/components/wireiq/edges/PowerEdge.tsx` — NEW (red, solid, thick)
11. `src/components/wireiq/edges/InjectionEdge.tsx` — NEW (orange, dashed)

**UI panels:**

12. `src/components/wireiq/WireIQTool.tsx` — NEW (main orchestrator component)
13. `src/components/wireiq/ImportPanel.tsx` — NEW (dual file upload)
14. `src/components/wireiq/DiagramCanvas.tsx` — NEW (React Flow wrapper)
15. `src/components/wireiq/DiagramToolbar.tsx` — NEW (view modes, zoom, search)
16. `src/components/wireiq/DiagramLegend.tsx` — NEW (color-coded wire legend)
17. `src/components/wireiq/DiagramStats.tsx` — NEW (sidebar stats panel)
18. `src/components/wireiq/NodeTooltip.tsx` — NEW (hover details)
19. `src/components/wireiq/ExportControls.tsx` — NEW (PNG, PDF, Shopping List link)

### Phase 5: Page Route + Integration

1. `src/app/wireiq/page.tsx` — NEW (Next.js page)
2. Navigation integration — add Wire:IQ to site nav
3. Supabase session persistence (save/load diagrams)

### Phase 6: Polish + Shopping List 2.0 Hook

1. Export to PNG/PDF
2. BOM data passed to Shopping List 2.0 via context or URL params
3. Print-friendly stylesheet
4. Accessibility: keyboard navigation, ARIA labels
5. Performance: virtualization for large displays (100+ props)

---

## 8. Technology Choices

### React Flow (`@xyflow/react`)

**Why**: React-native node-graph library. Nodes are React components styled with Tailwind. Built-in zoom/pan/minimap. Handle system maps directly to controller ports. Official Next.js examples. MIT licensed.

**Package**: `@xyflow/react` (current) — NOT the legacy `reactflow` package.

### ELK.js (`elkjs`)

**Why**: Port-aware layout algorithm that understands which edges connect to which handles. Minimizes edge crossings. Supports layered layout perfect for the controller → receiver → prop hierarchy. Runs async (web worker compatible).

**Package**: `elkjs`

### Why NOT Other Libraries

| Library | Reason for rejection |
|---------|---------------------|
| JointJS | SVG-based (not React components), commercial for advanced features |
| Rete.js | Designed for visual programming/dataflow, overkill for read-only diagrams |
| d3.js | Too low-level, React Flow already uses d3-zoom internally |
| Cytoscape.js | Canvas-based, limits custom node content |
| Dagre | Unmaintained since ~2015, no port support |

---

## 9. Type Definitions (Key New Types)

```typescript
// ── packages/xlights-file-gen/src/types/networks.ts ──

export interface ParsedController {
  name: string;
  type: "Ethernet" | "Serial" | "Null";
  ip: string;
  protocol: string;
  vendor: string;
  model: string;
  variant: string;
  active: boolean;
  autoSize: boolean;
  autoLayout: boolean;
  id: string;
  startUniverse: number;
  universeCount: number;
  channelsPerUniverse: number;
  totalChannels: number;
  portCount: number;
  maxPixelsPerPort: number;
  isReceiver: boolean;  // Detected receiver (vs. main controller)
  dipSwitch?: string;   // DIP switch setting if known
}

export interface ParsedNetworkConfig {
  controllers: ParsedController[];
  totalControllers: number;
  totalReceivers: number;
  totalUniverses: number;
  totalChannels: number;
}

export interface PortBinding {
  controllerName: string;
  port: number;
  models: PortModel[];  // Models chained on this port, in order
  totalPixels: number;
  maxPixels: number;
  utilizationPercent: number;
}

export interface PortModel {
  modelName: string;
  pixelCount: number;
  startPixel: number;  // Position in chain (1-based)
  chainOrder: number;  // 0 = first, 1 = second, etc.
}

// ── src/lib/wireiq/types.ts ──

export type DiagramViewMode = "full" | "network" | "wiring" | "power";

export type WireType = "ethernet" | "data" | "power" | "injection" | "ground";

export interface WireIQDiagramData {
  networkConfig: ParsedNetworkConfig;
  layout: ParsedLayout;
  portBindings: PortBinding[];
  powerPlan: PowerPlan;
  injectionPoints: InjectionPoint[];
  bom: BomItem[];
}

export interface DiagramNodeData {
  type: "controller" | "receiver" | "prop" | "propStack" | "psu" | "switch" | "injection";
  label: string;
  // Type-specific data via discriminated union
}

export interface DiagramEdgeData {
  wireType: WireType;
  label?: string;
  thickness: number;
  color: string;
  dashed: boolean;
}
```

---

## 10. Color Palette (Wire:IQ Brand)

Follows the warm-tone design system but with distinct wire colors:

| Element | Color | Tailwind Class | Hex |
|---------|-------|---------------|-----|
| Ethernet wire | Blue | `text-blue-500` | `#3B82F6` |
| Data wire | Amber | `text-amber-500` | `#F59E0B` |
| Power wire | Red | `text-red-500` | `#EF4444` |
| Injection wire | Orange | `text-orange-500` | `#F97316` |
| Ground wire | Gray | `text-gray-500` | `#6B7280` |
| Controller node | Slate | `bg-slate-800` | `#1E293B` |
| Receiver node | Indigo | `bg-indigo-900` | `#312E81` |
| Prop node | Zinc | `bg-zinc-800` | `#27272A` |
| PSU node | Yellow-tinted | `bg-yellow-950` | `#422006` |
| Port (OK) | Green | `text-green-500` | `#22C55E` |
| Port (Warning) | Yellow | `text-yellow-500` | `#EAB308` |
| Port (Overloaded) | Red | `text-red-500` | `#EF4444` |

---

## 11. Shopping List 2.0 Integration

Wire:IQ generates a `BomItem[]` that feeds directly into Shopping List 2.0:

```typescript
interface BomItem {
  category: "cable" | "connector" | "fuse" | "psu" | "enclosure" | "ethernet" | "splitter";
  description: string;
  quantity: number;
  unitCost: number;
  spec: string;
  sourceModel?: string;   // Which prop/run needs this
  priority: "required" | "recommended" | "optional";
}
```

The Shopping List 2.0 feature can:
- Import BOM directly from Wire:IQ session
- Allow user to adjust quantities and specs
- Link to vendor purchase pages
- Track what's already purchased

---

## 12. Testing Strategy

### Unit Tests (Vitest)
- Networks XML parser with real and synthetic XML fixtures
- Port resolver with various `StartChannel` formats
- Power calculator voltage drop formulas
- Injection point calculator thresholds
- Diagram transformer node/edge generation
- BOM generator calculations

### Integration Tests
- Full pipeline: XML files → parsed data → diagram data
- Port binding derivation from combined rgbeffects + networks data

### Component Tests (Testing Library)
- Custom node rendering with various data states
- Import panel file handling
- View mode switching
- Search functionality

### Test Fixtures
- Synthetic `xlights_networks.xml` with known controller configs
- Synthetic `xlights_rgbeffects.xml` with models on known ports
- Edge cases: single controller, 5+ controllers, missing port assignments

---

## 13. Performance Considerations

- **ELK.js layout**: Run in web worker to avoid blocking UI (async)
- **React Flow virtualization**: Only render visible nodes (built-in for large graphs)
- **Memoization**: Custom nodes wrapped in `React.memo` with stable props
- **Lazy loading**: React Flow + ELK loaded via dynamic import (Next.js `dynamic()`)
- **Large displays**: For 100+ props, consider collapsible port groups

---

## 14. Future Enhancements (Post-V1)

- **Drag-and-drop repositioning**: React Flow `onNodeDragStop` → persist to session
- **Editable properties**: Right-click node → edit voltage, gauge, PSU rating
- **Physical layout overlay**: Position props on a house outline / yard map
- **Real-time validation**: Warn on port overload, PSU oversize as user edits
- **Share/embed**: Shareable link to view-only diagram
- **Community templates**: Pre-built wiring templates for common controller setups
- **Import from FPP**: Parse FPP JSON config as alternative to xLights XML
- **3D view**: Three.js rendering of the house with wiring overlay

---

## 15. Dependencies to Install

```bash
npm install @xyflow/react elkjs
```

No other new dependencies required. The project already has React 19, Next.js 16, Tailwind CSS v4, and all other needed infrastructure.

---

## 16. File Manifest

### New Files

```
# Parser layer (xlights-file-gen)
packages/xlights-file-gen/src/parsers/networks-parser.ts
packages/xlights-file-gen/src/parsers/port-resolver.ts
packages/xlights-file-gen/src/types/networks.ts
packages/xlights-file-gen/src/__tests__/networks-parser.test.ts
packages/xlights-file-gen/src/__tests__/port-resolver.test.ts

# Engine layer (xwire)
packages/xwire/src/engine/injection-calculator.ts

# App engine (wireiq)
src/lib/wireiq/types.ts
src/lib/wireiq/diagram-transformer.ts
src/lib/wireiq/layout-engine.ts
src/lib/wireiq/power-rules.ts

# UI components
src/components/wireiq/WireIQTool.tsx
src/components/wireiq/ImportPanel.tsx
src/components/wireiq/DiagramCanvas.tsx
src/components/wireiq/DiagramToolbar.tsx
src/components/wireiq/DiagramLegend.tsx
src/components/wireiq/DiagramStats.tsx
src/components/wireiq/NodeTooltip.tsx
src/components/wireiq/ExportControls.tsx
src/components/wireiq/nodes/ControllerNode.tsx
src/components/wireiq/nodes/ReceiverNode.tsx
src/components/wireiq/nodes/PropNode.tsx
src/components/wireiq/nodes/PropStackNode.tsx
src/components/wireiq/nodes/PowerSupplyNode.tsx
src/components/wireiq/nodes/EthernetSwitchNode.tsx
src/components/wireiq/nodes/InjectionMarkerNode.tsx
src/components/wireiq/edges/EthernetEdge.tsx
src/components/wireiq/edges/DataEdge.tsx
src/components/wireiq/edges/PowerEdge.tsx
src/components/wireiq/edges/InjectionEdge.tsx

# Page route
src/app/wireiq/page.tsx

# Tests
src/lib/wireiq/__tests__/diagram-transformer.test.ts
src/lib/wireiq/__tests__/layout-engine.test.ts
packages/xwire/src/__tests__/power-calculator.test.ts
packages/xwire/src/__tests__/injection-calculator.test.ts
```

### Modified Files

```
packages/xlights-file-gen/src/index.ts          # Add network parser exports
packages/xlights-file-gen/src/parsers/index.ts  # Add network parser
packages/xwire/src/index.ts                     # Add injection calculator
packages/xwire/src/types/wiring.ts              # Extend types
packages/xwire/src/engine/power-calculator.ts   # Implement
packages/xwire/src/engine/cable-router.ts       # Implement
packages/xwire/src/engine/port-assigner.ts      # Implement
packages/xwire/src/engine/bill-of-materials.ts  # Implement
package.json                                     # Add @xyflow/react, elkjs
```
