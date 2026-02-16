# Ticket 88 — File Upload Error Recovery & Export Error Handling

**Priority:** P1 — Error handling gaps
**Applies to:** ModIQ file upload flow, export path
**Audit items:** File upload errors have no "Try Different File" recovery path; export failure has no try-catch — user gets unhandled JS error

---

## Current State

### File Upload Errors
Upload errors display a red banner (`ModIQTool.tsx:1054-1058`) but there is no explicit recovery action. The user must independently realize they can re-click the upload zone. The error message says what went wrong but doesn't say what to do next.

Source file upload (`ModIQTool.tsx:203-227`) and vendor XSQ upload (`ModIQTool.tsx:230-256`) both have try-catch blocks that call `setError()`, but the error UI has no actionable button.

### Export Errors
The export path has **zero error handling**:

**`ModIQTool.tsx:2237-2304` (`doExport`):**
```typescript
const doExport = useCallback((boostLines?: ...) => {
  const result = interactive.toMappingResult();
  const xmapContent = generateXmap(...);   // can throw
  downloadXmap(xmapContent, xsqFilename);  // can throw
  telemetry.trackAction({...});             // runs even if above fails
  onExported(fileName, {...});              // runs even if above fails
}, [...]);
```

**`xmap-generator.ts:127-139` (`downloadXmap`):**
```typescript
export function downloadXmap(xmapContent: string, xsqFilename: string): void {
  const blob = createXmapBlob(xmapContent);
  const url = URL.createObjectURL(blob);  // no try-catch
  const a = document.createElement("a");
  a.click();                               // can fail silently
  URL.revokeObjectURL(url);               // leaks if above throws
}
```

If `generateXmap()` throws (e.g., empty mapping result, malformed data), or `URL.createObjectURL` fails, the user gets an unhandled JS error with no recovery path. The `PostExportScreen` shows "Saved to downloads" regardless of whether the download actually succeeded.

---

## Proposed Changes

### 1. Upload Error Recovery Button
When a file upload error occurs, show alongside the error message:
- **"Try a Different File"** button that clears the error state and re-opens the file picker
- Keep the error text visible so the user understands what went wrong
- Placement: inline with the error banner, not a separate action

```
┌──────────────────────────────────────────┐
│ ⚠ Failed to parse: not a valid xSQ file │
│                     [Try a Different File]│
└──────────────────────────────────────────┘
```

### 2. Export Try-Catch Wrapper
Wrap the entire `doExport` function body in a try-catch:

```typescript
const doExport = useCallback((boostLines?: ...) => {
  try {
    const result = interactive.toMappingResult();
    const xmapContent = generateXmap(...);
    downloadXmap(xmapContent, xsqFilename);
    telemetry.trackAction({...});
    onExported(fileName, {...});
  } catch (err) {
    setExportError(err instanceof Error ? err.message : "Export failed");
    telemetry.trackAction({ action: "export_error", error: String(err) });
  }
}, [...]);
```

### 3. Export Error UI
When export fails, show an error state instead of the success screen:
- Error message explaining what happened
- **"Retry Export"** button that re-runs `doExport`
- **"Go Back to Mappings"** button to return to the mapping workspace
- Do NOT show PostExportScreen until export is confirmed successful

### 4. Input Validation in generateXmap
Add a guard at the top of `generateXmap()` (`xmap-generator.ts:41`):
```typescript
if (!result.mappings || result.mappings.length === 0) {
  throw new Error("No mappings to export — map at least one source layer before exporting");
}
```

---

## Files to Modify

| File | Change |
|------|--------|
| `ModIQTool.tsx` | Add "Try Different File" button to upload error UI; wrap `doExport` in try-catch; add `exportError` state |
| `xmap-generator.ts` | Add input validation to `generateXmap`; add try-catch to `downloadXmap` |
| `PostExportScreen.tsx` | Only render on confirmed success; add error variant |

---

## Acceptance Criteria

- [ ] Upload error shows "Try a Different File" button that clears state and re-opens picker
- [ ] `doExport` wrapped in try-catch — no unhandled JS errors reach the user
- [ ] Export failure shows error message with "Retry Export" and "Go Back" actions
- [ ] `generateXmap` validates non-empty mapping input
- [ ] PostExportScreen only appears after confirmed successful download initiation
- [ ] Telemetry tracks export errors separately from successes
