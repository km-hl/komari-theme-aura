import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  ensureStarted,
  getNodeSnapshot,
  getNodeTrafficTrendSnapshot,
  getVisibleNodeUuidsSnapshot,
  subscribe,
  subscribeToNode,
  getSnapshot,
} from "@/services/wsStore";
import type { NodeDisplay, TrafficTrendSample } from "@/types/komari";

const EMPTY_TRAFFIC_TREND_SNAPSHOT: { up: TrafficTrendSample[]; down: TrafficTrendSample[] } = {
  up: [],
  down: [],
};

function useEnsured(enabled = true) {
  useEffect(() => {
    if (enabled) ensureStarted();
  }, [enabled]);
}

export function useNode(uuid: string, enabled = true): NodeDisplay | undefined {
  useEnsured(enabled);
  return useSyncExternalStore(
    enabled ? (cb) => subscribeToNode(uuid, cb) : () => () => undefined,
    enabled ? () => getNodeSnapshot(uuid) : () => undefined,
    enabled ? () => getNodeSnapshot(uuid) : () => undefined,
  );
}

export function useNodeTrafficTrend(
  uuid: string,
  enabled = true,
): { up: TrafficTrendSample[]; down: TrafficTrendSample[] } {
  useEnsured(enabled);
  return useSyncExternalStore(
    enabled ? (cb) => subscribeToNode(uuid, cb) : () => () => undefined,
    enabled ? () => getNodeTrafficTrendSnapshot(uuid) : () => EMPTY_TRAFFIC_TREND_SNAPSHOT,
    enabled ? () => getNodeTrafficTrendSnapshot(uuid) : () => EMPTY_TRAFFIC_TREND_SNAPSHOT,
  );
}

export function useVisibleNodeUuids(): string[] {
  useEnsured();
  return useSyncExternalStore(
    subscribe,
    getVisibleNodeUuidsSnapshot,
    getVisibleNodeUuidsSnapshot,
  );
}

export function useNodeStoreStatus() {
  useEnsured();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => ({
      lastSuccessAt: snap.lastSuccessAt,
      failureStreak: snap.failureStreak,
    }),
    [snap.failureStreak, snap.lastSuccessAt],
  );
}

export function useGlobalStats() {
  useEnsured();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const visibleUuids = useVisibleNodeUuids();

  return useMemo(() => {
    let onlineCount = 0;
    let totalTrafficUp = 0;
    let totalTrafficDown = 0;
    let currentNetUp = 0;
    let currentNetDown = 0;
    const regions = new Set<string>();

    for (const uuid of visibleUuids) {
      const node = snap.byUuid[uuid];
      if (!node) continue;
      
      if (node.online) onlineCount++;
      if (node.region) regions.add(node.region);
      totalTrafficUp += node.trafficUp || 0;
      totalTrafficDown += node.trafficDown || 0;
      currentNetUp += node.netUp || 0;
      currentNetDown += node.netDown || 0;
    }

    return {
      totalCount: visibleUuids.length,
      onlineCount,
      uniqueRegions: regions.size,
      totalTrafficUp,
      totalTrafficDown,
      currentNetUp,
      currentNetDown,
    };
  }, [snap.byUuid, visibleUuids]);
}

export function useFilteredNodeUuids(searchQuery: string, group: string): string[] {
  const visibleUuids = useVisibleNodeUuids();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo(() => {
    if (!searchQuery && (!group || group === "所有" || group === "All")) return visibleUuids;

    const lowerQuery = searchQuery.toLowerCase();

    return visibleUuids.filter((uuid) => {
      const node = snap.byUuid[uuid];
      if (!node) return false;

      // Group filter
      if (group && group !== "所有" && group !== "All" && node.group !== group) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const matchName = node.name.toLowerCase().includes(lowerQuery);
        const matchOs = node.os?.toLowerCase().includes(lowerQuery);
        const matchRegion = node.region?.toLowerCase().includes(lowerQuery);
        return matchName || matchOs || matchRegion;
      }

      return true;
    });
  }, [visibleUuids, snap.byUuid, searchQuery, group]);
}
