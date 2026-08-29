import { formatBytes } from "@/utils/format";

export type TrafficLimitType = "max" | "min" | "sum" | "up" | "down";

export interface TrafficLimitUsage {
  used: number;
  limit: number;
  fraction: number;
  type: TrafficLimitType;
  label: string;
  summary: string;
}

function normalizeTrafficLimitType(value: string | null | undefined): TrafficLimitType {
  if (value === "max" || value === "min" || value === "sum" || value === "up" || value === "down") {
    return value;
  }
  return "max";
}

function getUsedTraffic(type: TrafficLimitType, up: number, down: number) {
  if (type === "sum") return up + down;
  if (type === "up") return up;
  if (type === "down") return down;
  if (type === "min") return Math.min(up, down);
  return Math.max(up, down);
}

function getTypeLabel(type: TrafficLimitType) {
  if (type === "sum") return "上行+下行";
  if (type === "up") return "上行";
  if (type === "down") return "下行";
  if (type === "min") return "较小值";
  return "较大值";
}

export function getTrafficLimitUsage({
  up,
  down,
  limit,
  type,
}: {
  up: number;
  down: number;
  limit: number;
  type?: string | null;
}): TrafficLimitUsage | null {
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const normalizedType = normalizeTrafficLimitType(type);
  const used = Math.max(0, getUsedTraffic(normalizedType, up || 0, down || 0));
  const fraction = Math.max(0, Math.min(1, used / limit));
  const label = getTypeLabel(normalizedType);

  return {
    used,
    limit,
    fraction,
    type: normalizedType,
    label,
    summary: `${formatBytes(used)} / ${formatBytes(limit)} · ${label}`,
  };
}
