export type CoastalTime = "dawn" | "day" | "dusk" | "night";

export function coastalTimeFromHour(hour: number): CoastalTime {
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 19) return "dusk";
  return "night";
}

export function getHongKongHour(date: Date = new Date()): number {
  const formatter = new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    hour: "2-digit",
    hour12: false,
  });
  const value = formatter.formatToParts(date).find((part) => part.type === "hour")?.value ?? "0";
  return Number(value === "24" ? "0" : value);
}

export function coastalTimeForDate(date: Date = new Date()): CoastalTime {
  return coastalTimeFromHour(getHongKongHour(date));
}
