const BYTES_IN_MB = 1024 * 1024;

function parseContentLength(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function parseContentRangeTotal(value: string | null): number | null {
  if (!value) return null;
  // Example: "bytes 0-0/12345"
  const match = value.match(/\/(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

async function resolveRemoteBytes(url: string): Promise<number | null> {
  try {
    const head = await fetch(url, {
      method: "HEAD",
      cache: "no-store",
    });
    const fromHead = parseContentLength(head.headers.get("content-length"));
    if (fromHead) return fromHead;
  } catch (error) {
    console.warn(
      "[StorageUsage] HEAD request failed, falling back",
      url,
      error,
    );
  }

  try {
    const range = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Range: "bytes=0-0" },
    });
    const fromRange = parseContentRangeTotal(
      range.headers.get("content-range"),
    );
    if (fromRange) return fromRange;
    const fromLength = parseContentLength(range.headers.get("content-length"));
    if (fromLength) return fromLength;
  } catch (error) {
    console.warn("[StorageUsage] Range request failed", url, error);
  }

  return null;
}

export const StorageUsageService = {
  async getUrlSizeMB(url: string | null | undefined): Promise<number> {
    const normalized = url?.trim();
    if (!normalized) return 0;
    const bytes = await resolveRemoteBytes(normalized);
    if (!bytes) return 0;
    // Festival counter is integer MB, so we round up to avoid under-counting.
    return Math.max(1, Math.ceil(bytes / BYTES_IN_MB));
  },

  async getUrlsSizeMB(urls: Array<string | null | undefined>): Promise<number> {
    if (!urls.length) return 0;
    const values = await Promise.all(urls.map((u) => this.getUrlSizeMB(u)));
    return values.reduce((sum, n) => sum + n, 0);
  },
};
