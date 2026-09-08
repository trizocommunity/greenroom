/**
 * Minimal STORE-only ZIP builder. We avoid pulling in a full archive
 * library for the badge/certificate "Illustration" export, which only
 * ever bundles two known files (a PDF + an .ai). The output is a valid
 * ZIP/UNZIP-compatible archive using method 0 (no compression) which is
 * optimal for already-compressed payloads like JPEG-wrapped PDF bytes.
 *
 * Reference: APPNOTE.TXT (PKWARE), ZIP file format specification.
 *
 * Limitations:
 *   - No compression. Callers should pass already-compressed bytes.
 *   - No Zip64. Each entry must be < 4 GiB; archive must be < 4 GiB.
 *   - No encryption, no extra fields, no data descriptors.
 *   - Filenames must be plain UTF-8 (no UTF-8 flag bit; the bytes are
 *     written verbatim, which modern unzippers handle).
 */

export interface ZipEntry {
  /** Path inside the archive, e.g. "badges.pdf". Forward slashes only. */
  name: string;
  /** Raw bytes to store. */
  data: Uint8Array;
}

/** Single-byte view of a DataView helper, kept tiny and dependency-free. */
function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

function toDosDateTime(d = new Date()): { date: number; time: number } {
  // DOS time: bits 0-4 = seconds/2, 5-10 = minutes, 11-15 = hours
  // DOS date: bits 0-4 = day, 5-8 = month, 9-15 = year-1980
  const time =
    (Math.floor(d.getSeconds() / 2) & 0x1f) |
    ((d.getMinutes() & 0x3f) << 5) |
    ((d.getHours() & 0x1f) << 11);
  const date =
    (d.getDate() & 0x1f) |
    (((d.getMonth() + 1) & 0x0f) << 5) |
    (((Math.max(d.getFullYear() - 1980, 0)) & 0x7f) << 9);
  return { date, time };
}

/**
 * Build a ZIP archive from the given entries using the STORE method.
 * Returns a single Uint8Array ready to wrap in a Blob / upload.
 */
export function buildZip(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
  // CRC-32 table (zlib polynomial, reflected).
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[i] = c >>> 0;
  }
  const crc32 = (bytes: Uint8Array): number => {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) {
      c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  };

  // UTF-8 encode names once and cache.
  const nameBytes = entries.map((e) => new TextEncoder().encode(e.name));
  const { date, time } = toDosDateTime();

  // Layout: local headers + data, then central directory, then EOCD.
  const localHeaderSize = 30;
  const cdHeaderSize = 46;
  const eocdSize = 22;

  let totalSize = 0;
  const localOffsets: number[] = [];
  for (let i = 0; i < entries.length; i++) {
    localOffsets.push(totalSize);
    totalSize +=
      localHeaderSize + nameBytes[i].length + entries[i].data.length;
  }
  const cdOffset = totalSize;
  totalSize += entries.length * cdHeaderSize;
  for (let i = 0; i < entries.length; i++) {
    totalSize += nameBytes[i].length;
  }
  totalSize += eocdSize;

  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);
  const cdView = new DataView(out.buffer);
  let cursor = 0;

  // Local file headers + entry data
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const name = nameBytes[i];
    const crc = crc32(entry.data);
    const compressedSize = entry.data.length;
    const uncompressedSize = entry.data.length;

    writeUint32(view, cursor, 0x04034b50); // local file header signature
    writeUint16(view, cursor + 4, 20); // version needed
    writeUint16(view, cursor + 6, 0); // general purpose flag
    writeUint16(view, cursor + 8, 0); // method = STORE
    writeUint16(view, cursor + 10, time);
    writeUint16(view, cursor + 12, date);
    writeUint32(view, cursor + 14, crc);
    writeUint32(view, cursor + 18, compressedSize);
    writeUint32(view, cursor + 22, uncompressedSize);
    writeUint16(view, cursor + 26, name.length);
    writeUint16(view, cursor + 28, 0); // extra field length
    out.set(name, cursor + 30);
    cursor += localHeaderSize + name.length;
    out.set(entry.data, cursor);
    cursor += entry.data.length;
  }

  // Central directory
  let cdCursor = cdOffset;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const name = nameBytes[i];
    const crc = crc32(entry.data);
    const compressedSize = entry.data.length;
    const uncompressedSize = entry.data.length;

    writeUint32(cdView, cdCursor, 0x02014b50); // central dir signature
    writeUint16(cdView, cdCursor + 4, 20); // version made by
    writeUint16(cdView, cdCursor + 6, 20); // version needed
    writeUint16(cdView, cdCursor + 8, 0); // flags
    writeUint16(cdView, cdCursor + 10, 0); // method = STORE
    writeUint16(cdView, cdCursor + 12, time);
    writeUint16(cdView, cdCursor + 14, date);
    writeUint32(cdView, cdCursor + 16, crc);
    writeUint32(cdView, cdCursor + 20, compressedSize);
    writeUint32(cdView, cdCursor + 24, uncompressedSize);
    writeUint16(cdView, cdCursor + 28, name.length);
    writeUint16(cdView, cdCursor + 30, 0); // extra field length
    writeUint16(cdView, cdCursor + 32, 0); // comment length
    writeUint16(cdView, cdCursor + 34, 0); // disk number
    writeUint16(cdView, cdCursor + 36, 0); // internal attrs
    writeUint32(cdView, cdCursor + 38, 0); // external attrs
    writeUint32(cdView, cdCursor + 42, localOffsets[i]);
    out.set(name, cdCursor + 46);
    cdCursor += cdHeaderSize + name.length;
  }

  // End of central directory record
  writeUint32(view, cdCursor, 0x06054b50);
  writeUint16(view, cdCursor + 4, 0); // disk number
  writeUint16(view, cdCursor + 6, 0); // disk where CD starts
  writeUint16(view, cdCursor + 8, entries.length);
  writeUint16(view, cdCursor + 10, entries.length);
  writeUint32(view, cdCursor + 12, cdCursor + eocdSize - cdOffset); // cd size
  writeUint32(view, cdCursor + 16, cdOffset);
  writeUint16(view, cdCursor + 20, 0); // comment length

  return out;
}
