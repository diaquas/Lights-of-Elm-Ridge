/* ------------------------------------------------------------------ */
/*  Minimal ID3 Tag Parser (browser)                                    */
/*  Extracts artist, title, and album from ID3v1 and ID3v2 tags.        */
/*  No external dependencies — works with the File API.                 */
/* ------------------------------------------------------------------ */

export interface ID3Tags {
  title?: string;
  artist?: string;
  album?: string;
}

/**
 * Parse ID3 tags from an MP3 file.
 * Tries ID3v2 first (beginning of file), then falls back to ID3v1 (end of file).
 */
export async function parseID3Tags(file: File): Promise<ID3Tags> {
  const tags: ID3Tags = {};

  // Try ID3v2 first (more common, richer data)
  try {
    const id3v2 = await parseID3v2(file);
    if (id3v2.artist || id3v2.title || id3v2.album) {
      return id3v2;
    }
  } catch {
    // ID3v2 parsing failed — try v1
  }

  // Fall back to ID3v1
  try {
    const id3v1 = await parseID3v1(file);
    if (id3v1.artist || id3v1.title || id3v1.album) {
      return id3v1;
    }
  } catch {
    // ID3v1 parsing failed too
  }

  return tags;
}

/* ── ID3v1 ──────────────────────────────────────────────────────────── */

/**
 * Parse ID3v1 tags from the last 128 bytes of the file.
 *
 * ID3v1 layout (128 bytes total):
 *   Offset 0-2:   "TAG" (3 bytes)
 *   Offset 3-32:  Title (30 bytes, null-padded)
 *   Offset 33-62: Artist (30 bytes, null-padded)
 *   Offset 63-92: Album (30 bytes, null-padded)
 */
async function parseID3v1(file: File): Promise<ID3Tags> {
  if (file.size < 128) return {};

  const slice = file.slice(file.size - 128, file.size);
  const buffer = await slice.arrayBuffer();
  const view = new DataView(buffer);

  // Check for "TAG" marker
  const tag =
    String.fromCharCode(view.getUint8(0)) +
    String.fromCharCode(view.getUint8(1)) +
    String.fromCharCode(view.getUint8(2));

  if (tag !== "TAG") return {};

  const decoder = new TextDecoder("iso-8859-1");

  return {
    title: cleanString(decoder.decode(new Uint8Array(buffer, 3, 30))),
    artist: cleanString(decoder.decode(new Uint8Array(buffer, 33, 30))),
    album: cleanString(decoder.decode(new Uint8Array(buffer, 63, 30))),
  };
}

/* ── ID3v2 ──────────────────────────────────────────────────────────── */

/**
 * Parse ID3v2.3/v2.4 tags from the beginning of the file.
 *
 * We only extract text frames we care about:
 *   TPE1 = Lead artist
 *   TIT2 = Title
 *   TALB = Album
 */
async function parseID3v2(file: File): Promise<ID3Tags> {
  // Read the header (10 bytes minimum)
  const headerSlice = file.slice(0, 10);
  const headerBuf = await headerSlice.arrayBuffer();
  const headerView = new DataView(headerBuf);

  // Check "ID3" marker
  const marker =
    String.fromCharCode(headerView.getUint8(0)) +
    String.fromCharCode(headerView.getUint8(1)) +
    String.fromCharCode(headerView.getUint8(2));

  if (marker !== "ID3") return {};

  const majorVersion = headerView.getUint8(3);
  if (majorVersion < 2 || majorVersion > 4) return {};

  // Size is a synchsafe integer (4 bytes, 7 bits each)
  const tagSize = decodeSynchsafe(headerView, 6);
  const totalSize = Math.min(tagSize + 10, file.size);

  // Read the full tag data
  const tagSlice = file.slice(0, totalSize);
  const tagBuf = await tagSlice.arrayBuffer();
  const data = new Uint8Array(tagBuf);

  const tags: ID3Tags = {};
  const frameHeaderSize = majorVersion === 2 ? 6 : 10;
  const frameIdSize = majorVersion === 2 ? 3 : 4;

  // Map v2.2 3-char frame IDs to v2.3+ 4-char IDs
  const frameMap: Record<string, keyof ID3Tags> =
    majorVersion === 2
      ? { TP1: "artist", TT2: "title", TAL: "album" }
      : { TPE1: "artist", TIT2: "title", TALB: "album" };

  let offset = 10;

  // Skip extended header if present
  const flags = data[5];
  if (majorVersion >= 3 && flags & 0x40) {
    const extSize =
      majorVersion === 4
        ? decodeSynchsafeFromArray(data, offset)
        : new DataView(tagBuf).getUint32(offset);
    offset += majorVersion === 4 ? extSize : extSize + 4;
  }

  while (offset + frameHeaderSize < totalSize) {
    // Read frame ID
    let frameId = "";
    for (let i = 0; i < frameIdSize; i++) {
      const ch = data[offset + i];
      if (ch === 0) break;
      frameId += String.fromCharCode(ch);
    }

    // Stop if we hit padding (null bytes)
    if (frameId.length === 0 || frameId[0] === "\0") break;

    // Read frame size
    let frameSize: number;
    if (majorVersion === 2) {
      frameSize =
        (data[offset + 3] << 16) | (data[offset + 4] << 8) | data[offset + 5];
    } else if (majorVersion === 4) {
      frameSize = decodeSynchsafeFromArray(data, offset + 4);
    } else {
      const view = new DataView(tagBuf);
      frameSize = view.getUint32(offset + 4);
    }

    if (frameSize <= 0 || offset + frameHeaderSize + frameSize > totalSize) {
      break;
    }

    const field = frameMap[frameId];
    if (field) {
      const frameData = data.slice(
        offset + frameHeaderSize,
        offset + frameHeaderSize + frameSize,
      );
      const text = decodeTextFrame(frameData);
      if (text) {
        tags[field] = text;
      }
    }

    offset += frameHeaderSize + frameSize;
  }

  return tags;
}

/* ── Utilities ──────────────────────────────────────────────────────── */

/** Decode a synchsafe integer from a DataView (4 bytes, 7 bits each). */
function decodeSynchsafe(view: DataView, offset: number): number {
  return (
    ((view.getUint8(offset) & 0x7f) << 21) |
    ((view.getUint8(offset + 1) & 0x7f) << 14) |
    ((view.getUint8(offset + 2) & 0x7f) << 7) |
    (view.getUint8(offset + 3) & 0x7f)
  );
}

/** Decode a synchsafe integer from a Uint8Array. */
function decodeSynchsafeFromArray(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] & 0x7f) << 21) |
    ((data[offset + 1] & 0x7f) << 14) |
    ((data[offset + 2] & 0x7f) << 7) |
    (data[offset + 3] & 0x7f)
  );
}

/**
 * Decode a text frame.
 * First byte is the encoding:
 *   0x00 = ISO-8859-1
 *   0x01 = UTF-16 with BOM
 *   0x02 = UTF-16BE
 *   0x03 = UTF-8
 */
function decodeTextFrame(frameData: Uint8Array): string | null {
  if (frameData.length < 2) return null;

  const encoding = frameData[0];
  const textBytes = frameData.slice(1);

  let text: string;

  switch (encoding) {
    case 0x00: {
      // ISO-8859-1
      const decoder = new TextDecoder("iso-8859-1");
      text = decoder.decode(textBytes);
      break;
    }
    case 0x01: {
      // UTF-16 with BOM
      const decoder = new TextDecoder("utf-16");
      text = decoder.decode(textBytes);
      break;
    }
    case 0x02: {
      // UTF-16BE (no BOM)
      const decoder = new TextDecoder("utf-16be");
      text = decoder.decode(textBytes);
      break;
    }
    case 0x03: {
      // UTF-8
      const decoder = new TextDecoder("utf-8");
      text = decoder.decode(textBytes);
      break;
    }
    default:
      return null;
  }

  return cleanString(text) ?? null;
}

/** Remove null bytes and trim whitespace. */
function cleanString(str: string): string | undefined {
  const cleaned = str.replace(/\0/g, "").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}
