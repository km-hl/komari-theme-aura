import { useMemo } from "react";
import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot } from "@/services/wsStore";
import { useVisibleNodeUuids } from "@/hooks/useNode";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";

import { resolveFlagCode } from "@/components/ui/Flag";

const geoUrl = "/world.json";

// Map alpha-2 codes (commonly used in ServerStatus/Nezha) to TopoJSON numeric IDs
const alpha2ToNumeric: Record<string, string> = {
  US: "840", CN: "156", HK: "344", TW: "158", JP: "392",
  SG: "702", KR: "410", DE: "276", FR: "250", GB: "826", UK: "826",
  NL: "528", CA: "124", AU: "036", RU: "643", IN: "356",
  MY: "458", ID: "360", VN: "704", TH: "764", PH: "608",
  BR: "076", ZA: "710", AE: "784", SA: "682", IT: "380",
  ES: "724", SE: "752", CH: "756", AT: "040", FI: "246",
  NO: "578", DK: "208", PL: "616", CZ: "203", RO: "642",
  TR: "792", IL: "376", MX: "484", AR: "032", CL: "152",
  CO: "170", NZ: "554", IE: "372", PT: "620", GR: "300",
  BE: "056", LU: "442", MO: "446", UA: "804", EG: "818"
};

// Coordinates [longitude, latitude] for small regions often missing from 110m map
const microstateCoords: Record<string, [number, number]> = {
  "344": [114.1694, 22.3193], // Hong Kong
  "702": [103.8198, 1.3521],  // Singapore
  "446": [113.5439, 22.1987], // Macau
  "048": [50.5577, 26.0667],  // Bahrain
  "470": [14.3754, 35.9375],  // Malta
  "492": [7.4246, 43.7384],   // Monaco
};

export default function WorldMap() {
  const visibleUuids = useVisibleNodeUuids();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Determine status per country ID
  const regionStatusMap = useMemo(() => {
    // region mapping: { numericId: { total: number, online: number } }
    const map = new Map<string, { total: number; online: number }>();

    for (const uuid of visibleUuids) {
      const node = snap.byUuid[uuid];
      if (!node || !node.region) continue;

      const code = resolveFlagCode(node.region);
      if (!code) continue;
      
      const numericId = alpha2ToNumeric[code];
      if (!numericId) continue;

      if (!map.has(numericId)) {
        map.set(numericId, { total: 0, online: 0 });
      }
      const data = map.get(numericId)!;
      data.total += 1;
      if (node.online) {
        data.online += 1;
      }
    }

    // Convert to status map: { numericId: "online" | "partial" | "offline" }
    const statusMap = new Map<string, "online" | "partial" | "offline">();
    map.forEach((data, id) => {
      if (data.online === data.total) {
        statusMap.set(id, "online");
      } else if (data.online === 0) {
        statusMap.set(id, "offline");
      } else {
        statusMap.set(id, "partial");
      }
    });

    return statusMap;
  }, [visibleUuids, snap.byUuid]);

  const getColor = (id: string) => {
    const status = regionStatusMap.get(id);
    if (status === "online") return "var(--status-success)";
    if (status === "partial") return "var(--status-warning)";
    if (status === "offline") return "var(--status-error)";
    return "var(--fill-tertiary)";
  };

  return (
    <div className="relative w-full overflow-hidden server-card mt-6 p-4">
      <div className="w-full aspect-[2.2/1] relative">
        <ComposableMap
          projectionConfig={{ scale: 140 }}
          width={800}
          height={400}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup center={[0, 0]} zoom={1} minZoom={1} maxZoom={4}>
            <Graticule stroke="var(--border)" strokeWidth={0.5} opacity={0.5} />
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(geo.id)}
                    stroke="var(--surface)"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none", transition: "all 250ms" },
                      hover: {
                        fill: regionStatusMap.has(geo.id) ? getColor(geo.id) : "var(--border)",
                        outline: "none",
                        cursor: "pointer",
                      },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>
            {/* Render markers for microstates that are active but not on the map */}
            {Array.from(regionStatusMap.entries()).map(([id]) => {
              const coords = microstateCoords[id];
              if (coords) {
                return (
                  <Marker key={`marker-${id}`} coordinates={coords}>
                    <circle r={2.5} fill={getColor(id)} stroke="var(--surface)" strokeWidth={0.5} />
                  </Marker>
                );
              }
              return null;
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-[var(--surface)]/80 backdrop-blur-md border border-[var(--border)] rounded-lg p-3 flex flex-col gap-2 text-xs font-medium text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--status-success)]"></div>
            全部在线
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--status-warning)]"></div>
            部分在线
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--status-error)]"></div>
            全部离线
          </div>
        </div>
      </div>
    </div>
  );
}
