import { describe, expect, it } from "vitest";

import { FALLBACK_DISPLAY } from "../constants";
import {
  formatDate,
  formatDateTime,
  formatRelative,
  formatTime,
} from "../format";

// Helpers compute the expected local-time output using the runner's
// timezone so the suite passes on any machine. The browser-local
// contract is "what the user sees in their clock" — that's exactly
// what the runner sees.
const SAMPLE_INSTANT = "2026-08-15T03:30:00.000Z";
const sampleDate = new Date(SAMPLE_INSTANT);

const pad = (n: number) => n.toString().padStart(2, "0");
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function localDateMedium(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function localDateShort(d: Date): string {
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function localDateLong(d: Date): string {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function localTimeShort(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localTimeMedium(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function localDateTimeMedium(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

describe("formatDate", () => {
  it("renders the instant in the runner's local timezone", () => {
    expect(formatDate(SAMPLE_INSTANT)).toBe(localDateMedium(sampleDate));
  });

  it("supports short style", () => {
    expect(formatDate(SAMPLE_INSTANT, { style: "short" })).toBe(
      localDateShort(sampleDate),
    );
  });

  it("supports long style", () => {
    expect(formatDate(SAMPLE_INSTANT, { style: "long" })).toBe(
      localDateLong(sampleDate),
    );
  });

  it("returns fallback for null / invalid input", () => {
    expect(formatDate(null)).toBe(FALLBACK_DISPLAY);
    expect(formatDate(undefined)).toBe(FALLBACK_DISPLAY);
    expect(formatDate("not-a-date")).toBe(FALLBACK_DISPLAY);
  });
});

describe("formatTime", () => {
  it("renders the instant in the runner's local timezone", () => {
    expect(formatTime(SAMPLE_INSTANT)).toBe(localTimeShort(sampleDate));
  });

  it("supports medium style with seconds", () => {
    expect(formatTime(SAMPLE_INSTANT, { style: "medium" })).toBe(
      localTimeMedium(sampleDate),
    );
  });

  it("returns fallback for null", () => {
    expect(formatTime(null)).toBe(FALLBACK_DISPLAY);
  });
});

describe("formatDateTime", () => {
  it("renders date + time in the runner's local timezone", () => {
    expect(formatDateTime(SAMPLE_INSTANT)).toBe(
      localDateTimeMedium(sampleDate),
    );
  });

  it("supports long style", () => {
    const out = formatDateTime(SAMPLE_INSTANT, {
      dateStyle: "long",
      timeStyle: "medium",
    });
    // We can't fully pin the day-of-week without TZ, but we can pin the
    // date + time components the medium formatter always emits.
    expect(out).toMatch(/\d{2}:\d{2}:\d{2}$/);
    expect(out).toContain(String(sampleDate.getFullYear()));
  });

  it("returns fallback for null", () => {
    expect(formatDateTime(null)).toBe(FALLBACK_DISPLAY);
  });
});

describe("formatRelative", () => {
  it("formats 'ago' for past instants", () => {
    const past = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelative(past)).toMatch(/hours? ago/);
  });

  it("formats 'in X' for future instants when base is provided", () => {
    const future = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const base = new Date().toISOString();
    expect(formatRelative(future, base)).toMatch(/^in /);
  });

  it("returns fallback for null / invalid", () => {
    expect(formatRelative(null)).toBe(FALLBACK_DISPLAY);
    expect(formatRelative("not-a-date")).toBe(FALLBACK_DISPLAY);
  });

  it("formats 'ago' for past instants when base is provided", () => {
    const past = "2026-01-01T00:00:00.000Z";
    const base = "2026-01-02T00:00:00.000Z";
    expect(formatRelative(past, base)).toMatch(/ago$/);
  });
});
