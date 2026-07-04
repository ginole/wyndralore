// Free-tier daily draw quota for signed-out visitors (PRD §4.1, §3.3).
// Phase 1 only implements the base 1-per-day allowance; share/ad bonuses land in Phase 2.
const STORAGE_KEY = "wyndralore.dailyUsage";
const BASE_FREE_DRAWS = 1;

interface DailyUsage {
  date: string; // local YYYY-MM-DD
  drawsUsed: number;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readUsage(): DailyUsage {
  if (typeof window === "undefined") return { date: todayKey(), drawsUsed: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: todayKey(), drawsUsed: 0 };
    const parsed = JSON.parse(raw) as DailyUsage;
    if (parsed.date !== todayKey()) return { date: todayKey(), drawsUsed: 0 };
    return parsed;
  } catch {
    return { date: todayKey(), drawsUsed: 0 };
  }
}

function writeUsage(usage: DailyUsage) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

export function getRemainingDraws(): number {
  const usage = readUsage();
  return Math.max(0, BASE_FREE_DRAWS - usage.drawsUsed);
}

export function canDraw(): boolean {
  return getRemainingDraws() > 0;
}

export function recordDraw(): void {
  const usage = readUsage();
  writeUsage({ date: usage.date, drawsUsed: usage.drawsUsed + 1 });
}
