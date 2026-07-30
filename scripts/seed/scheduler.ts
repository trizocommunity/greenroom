import { FESTIVAL_DAYS } from "./config";

type Break = [number, number, string];

const DAILY_BREAKS: Break[] = [
  [13 * 60, 13 * 60 + 30, "Dhuhr Prayer & Lunch"],
  [16 * 60 + 30, 17 * 60, "Asr Prayer & Tea"],
  [18 * 60 + 45, 19 * 60 + 15, "Maghrib Prayer"],
  [20 * 60 + 30, 21 * 60, "Isha Prayer & Dinner"],
];

const END_OF_DAY_MIN = 22 * 60;
const START_OF_DAY_MIN = 9 * 60;

export type Slot = {
  startTime: string;
  endTime: string;
  dayDate: string;
};

/**
 * Zero-overlap scheduler that respects daily prayer/food breaks. Used to
 * fallback when a programme doesn't have an explicit PROGRAMME_SCHEDULE entry.
 */
export class FestivalScheduler {
  private currentDayIdx = 0;
  private currentMinutes = START_OF_DAY_MIN;

  allocateSlot(durationMinutes: number): Slot {
    while (true) {
      if (this.currentMinutes + durationMinutes > END_OF_DAY_MIN) {
        this.currentDayIdx = Math.min(
          this.currentDayIdx + 1,
          FESTIVAL_DAYS.length - 1,
        );
        this.currentMinutes = START_OF_DAY_MIN;
        continue;
      }

      const overlap = DAILY_BREAKS.find(
        ([start, end]) =>
          (this.currentMinutes >= start && this.currentMinutes < end) ||
          (this.currentMinutes + durationMinutes > start &&
            this.currentMinutes + durationMinutes <= end) ||
          (this.currentMinutes <= start &&
            this.currentMinutes + durationMinutes >= end),
      );
      if (overlap) {
        this.currentMinutes = overlap[1];
        continue;
      }
      break;
    }

    const dayDate = FESTIVAL_DAYS[this.currentDayIdx];
    const startTime = `${dayDate}T${pad(this.currentMinutes / 60)}:${pad(
      this.currentMinutes % 60,
    )}:00.000Z`;
    const endTotal = this.currentMinutes + durationMinutes;
    const endTime = `${dayDate}T${pad(endTotal / 60)}:${pad(
      endTotal % 60,
    )}:00.000Z`;

    this.currentMinutes = endTotal + 15;

    return { startTime, endTime, dayDate };
  }
}

function pad(n: number): string {
  return Math.floor(n).toString().padStart(2, "0");
}
