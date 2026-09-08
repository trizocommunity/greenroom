import { describe, expect, it } from "vitest";
import { buildZip } from "@/features/exports/lib/zip";

const enc = new TextEncoder();

/** Read a 4-byte little-endian uint32 starting at `offset`. */
function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

/** Read a 2-byte little-endian uint16 starting at `offset`. */
function readU16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] | (bytes[offset + 1] << 8)) & 0xffff;
}

function findEocd(bytes: Uint8Array): number {
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (readU32(bytes, i) === 0x06054b50) return i;
  }
  throw new Error("EOCD signature not found");
}

interface ParsedEntry {
  name: string;
  crc: number;
  size: number;
  localOffset: number;
  data: Uint8Array;
}

function parseZip(bytes: Uint8Array): ParsedEntry[] {
  const eocdOffset = findEocd(bytes);
  const total = readU16(bytes, eocdOffset + 10);
  const cdOffset = readU32(bytes, eocdOffset + 16);

  const entries: ParsedEntry[] = [];
  let p = cdOffset;
  for (let i = 0; i < total; i++) {
    if (readU32(bytes, p) !== 0x02014b50) {
      throw new Error(`bad CD signature at ${p}`);
    }
    const crc = readU32(bytes, p + 16);
    const size = readU32(bytes, p + 20);
    const nameLen = readU16(bytes, p + 28);
    const localOffset = readU32(bytes, p + 42);
    const name = new TextDecoder().decode(bytes.slice(p + 46, p + 46 + nameLen));
    p += 46 + nameLen;

    const localNameLen = readU16(bytes, localOffset + 26);
    const dataStart = localOffset + 30 + localNameLen;
    const data = bytes.slice(dataStart, dataStart + size);
    entries.push({ name, crc, size, localOffset, data });
  }
  return entries;
}

describe("buildZip", () => {
  it("emits a valid empty archive", () => {
    const zip = buildZip([]);
    expect(zip.byteLength).toBe(22); // EOCD only
    expect(readU32(zip, 0)).toBe(0x06054b50);
    expect(readU16(zip, 8)).toBe(0); // total entries
  });

  it("round-trips a single small file", () => {
    const body = enc.encode("hello zip");
    const zip = buildZip([{ name: "hello.txt", data: body }]);
    const entries = parseZip(zip);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe("hello.txt");
    expect(entries[0].size).toBe(body.length);
    expect(new TextDecoder().decode(entries[0].data)).toBe("hello zip");
  });

  it("round-trips multiple files with their CRC-32s", () => {
    const a = enc.encode("alpha");
    const b = enc.encode("bravo-charlie");
    const c = enc.encode("delta");
    const zip = buildZip([
      { name: "a.txt", data: a },
      { name: "folder/b.txt", data: b },
      { name: "c.bin", data: c },
    ]);
    const entries = parseZip(zip);
    expect(entries.map((e) => e.name)).toEqual([
      "a.txt",
      "folder/b.txt",
      "c.bin",
    ]);
    expect(entries.map((e) => new TextDecoder().decode(e.data))).toEqual([
      "alpha",
      "bravo-charlie",
      "delta",
    ]);
  });

  it("uses STORE method (0) for already-compressed payloads", () => {
    const zip = buildZip([{ name: "x", data: enc.encode("payload") }]);
    // local header method is at offset 8
    expect(readU16(zip, 8)).toBe(0);
    // central dir method is at offset + 8 of the CD record
    const eocdOffset = findEocd(zip);
    const cdOffset = readU32(zip, eocdOffset + 16);
    expect(readU16(zip, cdOffset + 10)).toBe(0);
  });
});
