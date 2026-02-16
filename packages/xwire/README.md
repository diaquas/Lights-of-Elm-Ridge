# @lightsofelmridge/xwire

Wiring diagram generator for xLights displays.

## Status: Scaffold

This package is scaffolded but not yet implemented. All engine functions throw `Not implemented`.

## What it will do

Given an xLights layout file, xWire will:
1. **Assign controller ports** — Map props to controller ports respecting pixel limits
2. **Calculate power** — Voltage drop analysis, injection point recommendations, PSU sizing
3. **Route cables** — Optimal cable routing from controllers to props
4. **Generate BOM** — Bill of materials with cable lengths, connectors, fuses

## Dependencies

- `@lightsofelmridge/xlights-file-gen` — For reading layout files and controller specs

## Architecture

- `src/engine/` — Calculation engines (power, routing, port assignment, BOM)
- `src/data/` — Reference tables (wire gauges, pixel power specs, controller ports)
- `src/ui/` — React components (wiring diagram renderer, BOM table)
- `src/types/` — TypeScript type definitions
