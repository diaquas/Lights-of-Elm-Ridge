# xWire — Product Vision

## What is xWire?

xWire generates wiring diagrams and bills of materials from xLights layout files. Given a display layout (from xlights-file-gen), it calculates:

1. **Controller port assignments** — Which prop connects to which port
2. **Power requirements** — Voltage drop analysis, injection points, PSU sizing
3. **Cable routing** — Optimal paths from controllers to props with lengths
4. **Bill of materials** — Shopping list of cables, connectors, fuses, enclosures

## Why?

Wiring is the #1 source of frustration for new display builders. xWire removes the guesswork:
- No more voltage drop surprises (brown pixels at end of runs)
- No more undersized power supplies
- No more "will this all fit on my controller?" questions
- Ready-to-print shopping lists with exact cable lengths

## Integration

- Reads layout from `@lightsofelmridge/xlights-file-gen`
- Controller specs from shared controller database
- Embeds in the web storefront at `/tools/xwire`
- Part of the "Start Your Show" onboarding flow

## Status

Scaffolded in `packages/xwire/`. Not yet implemented.
