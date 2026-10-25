const TZ = "Asia/Ulaanbaatar";

export function getZonedParts(date = new Date()) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
  };
}

export function todayInUlaanbaatar() {
  return getZonedParts().date;
}

export function addDays(dateStr: string, days: number) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function zonedDateTime(dateStr: string, time: string) {
  const safeTime = time.length === 5 ? `${time}:00` : time;
  return new Date(`${dateStr}T${safeTime}+08:00`).toISOString();
}

export function toUlaanbaatarDate(iso: string) {
  return getZonedParts(new Date(iso)).date;
}

export function isMealDatePassed(mealDate: string, now = new Date()) {
  return mealDate < getZonedParts(now).date;
}

export function mealOrderBlockReason(meal: {
  isActive: boolean;
  mealDate: string;
  availableQuantity: number;
}) {
  if (!meal.isActive) return "Энэ хоол одоогоор идэвхгүй байна.";
  if (isMealDatePassed(meal.mealDate)) return "Өмнөх өдрийн хоол захиалах боломжгүй.";
  if (meal.availableQuantity <= 0) return "Порц дууссан байна.";
  return null;
}

export function formatMoney(amount: number) {
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${formatted}₮`;
}

const MONTHS_MN = [
  "нэгдүгээр",
  "хоёрдугаар",
  "гуравдугаар",
  "дөрөвдүгээр",
  "тавдугаар",
  "зургаадугаар",
  "долдугаар",
  "наймдугаар",
  "есдүгээр",
  "аравдугаар",
  "арван нэгдүгээр",
  "арван хоёрдугаар",
];

const WEEKDAYS_MN = ["ням", "даваа", "мягмар", "лхагва", "пүрэв", "баасан", "бямба"];

export function formatMongolianDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
  return `${year} оны ${MONTHS_MN[month - 1]} сарын ${day}, ${WEEKDAYS_MN[weekday]} гараг`;
}

export function formatDateTime(iso: string) {
  const { date, time } = getZonedParts(new Date(iso));
  return `${date.replaceAll("-", ".")} ${time}`;
}

export function formatMonthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return `${year} оны ${MONTHS_MN[(month ?? 1) - 1]} сар`;
}

export function formatShortDate(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${month}.${day}`;
}

export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("976") && digits.length === 11) return digits.slice(3);
  return digits;
}

export function isMnPhone(input: string) {
  return /^[6-9]\d{7}$/.test(normalizePhone(input));
}

export function formatPhone(phone: string) {
  const normalized = normalizePhone(phone);
  if (normalized.length === 8) return `${normalized.slice(0, 4)} ${normalized.slice(4)}`;
  return phone;
}

export function fullName(lastName: string, firstName: string) {
  return `${lastName} ${firstName}`.trim();
}

export function initials(lastName: string, firstName: string) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "А";
}

export function rangeFor(preset: "day" | "week" | "month", today = todayInUlaanbaatar()) {
  if (preset === "day") return { from: today, to: today };
  if (preset === "week") return { from: addDays(today, -6), to: today };
  return { from: `${today.slice(0, 8)}01`, to: today };
}

export function eachDate(from: string, to: string) {
  const dates: string[] = [];
  let cursor = from;
  while (cursor <= to) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function nextOrderNumber(existing: string[], date: string) {
  const prefix = `ORD-${date.replaceAll("-", "")}-`;
  const max = existing.reduce((highest, number) => {
    if (!number.startsWith(prefix)) return highest;
    const value = Number(number.slice(prefix.length));
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}
