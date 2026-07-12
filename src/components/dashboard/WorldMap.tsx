import { useMemo, useState, useEffect, useRef } from "react";
import { useSyncExternalStore } from "react";
import { subscribe, getSnapshot } from "@/services/wsStore";
import { useVisibleNodeUuids } from "@/hooks/useNode";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import {
  ComposableMap,
  Geographies,
  Geography,
  Graticule,
  Marker,
  Sphere,
} from "react-simple-maps";

import { resolveFlagCode, Flag } from "@/components/ui/Flag";

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
  BE: "056", LU: "442", MO: "446", UA: "804", EG: "818", MT: "470", MC: "492", BH: "048"
};

const numericToAlpha2: Record<string, string> = Object.fromEntries(
  Object.entries(alpha2ToNumeric).map(([k, v]) => [v, k])
);

// Coordinates [longitude, latitude] for region centroids
const countryCentroids: Record<string, [number, number]> = {
  US: [-95.7129, 37.0902], CN: [104.1954, 35.8617], HK: [114.1694, 22.3193], TW: [120.9605, 23.6978], JP: [138.2529, 36.2048],
  SG: [103.8198, 1.3521], KR: [127.7669, 35.9078], DE: [10.4515, 51.1657], FR: [2.2137, 46.2276], GB: [-3.4360, 55.3781], UK: [-3.4360, 55.3781],
  NL: [5.2913, 52.1326], CA: [-106.3468, 56.1304], AU: [133.7751, -25.2744], RU: [105.3188, 61.5240], IN: [78.9629, 20.5937],
  MY: [101.9758, 4.2105], ID: [113.9213, -0.7893], VN: [108.2772, 14.0583], TH: [100.9925, 15.8700], PH: [121.7740, 12.8797],
  BR: [-51.9253, -14.2350], ZA: [22.9375, -30.5595], AE: [53.8478, 23.4241], SA: [45.0792, 23.8859], IT: [12.5674, 41.8719],
  ES: [-3.7492, 40.4637], SE: [18.6435, 60.1282], CH: [8.2275, 46.8182], AT: [14.5501, 47.5162], FI: [25.7482, 61.9241],
  NO: [8.4689, 60.4720], DK: [9.5018, 56.2639], PL: [19.1451, 51.9194], CZ: [15.4730, 49.8175], RO: [24.9668, 45.9432],
  TR: [35.2433, 38.9637], IL: [34.8516, 31.0461], MX: [-102.5528, 23.6345], AR: [-63.6167, -38.4161], CL: [-71.5430, -35.6751],
  CO: [-74.2973, 4.5709], NZ: [174.8860, -40.9006], IE: [-8.2439, 53.4129], PT: [-8.2245, 39.3999], GR: [21.8243, 39.0742],
  BE: [4.4699, 50.5039], LU: [6.1296, 49.8153], MO: [113.5439, 22.1987], UA: [31.1656, 48.3794], EG: [30.8025, 26.8206],
  MT: [14.3754, 35.9375], MC: [7.4246, 43.7384], BH: [50.5577, 26.0667],
};

export default function WorldMap() {
  const visibleUuids = useVisibleNodeUuids();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { data: config } = usePublicConfig();
  const customColor = (config?.theme_settings as any)?.mapRegionColor;
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: -10 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    // Prevent text selection only for mouse events
    if (e.type === 'mousedown') {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialPinchDist(dist);
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setInitialPinchDist(null);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (e.type === 'touchmove') {
      const te = e as React.TouchEvent;
      if (te.touches.length === 2 && initialPinchDist != null) {
        te.preventDefault(); // prevent browser zoom
        const dist = Math.hypot(
          te.touches[0].clientX - te.touches[1].clientX,
          te.touches[0].clientY - te.touches[1].clientY
        );
        const scaleChange = dist / initialPinchDist;
        setZoom(z => Math.min(Math.max(1, z * scaleChange), 3));
        setInitialPinchDist(dist);
        return;
      }
    }

    if (!isDragging) return;
    
    // For single touch move, prevent default scrolling so we can rotate the globe
    if (e.type === 'touchmove') {
      e.preventDefault();
    }

    const clientX = 'touches' in e ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as React.TouchEvent).touches[0].clientY : (e as React.MouseEvent).clientY;
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    setRotation(r => ({
      x: (r.x - (deltaX * 0.4) / zoom) % 360,
      y: Math.max(-80, Math.min(80, r.y + (deltaY * 0.4) / zoom))
    }));
    setDragStart({ x: clientX, y: clientY });
  };

  useEffect(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.min(Math.max(1, z - e.deltaY * 0.002), 3));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    let frameId: number;
    let lastTime = performance.now();
    
    const updateRotation = (time: number) => {
      const delta = time - lastTime;
      if (delta > 30) {
        if (!isDragging) {
          setRotation((r) => ({ ...r, x: (r.x + 0.2) % 360 }));
        }
        lastTime = time;
      }
      frameId = requestAnimationFrame(updateRotation);
    };
    frameId = requestAnimationFrame(updateRotation);
    return () => cancelAnimationFrame(frameId);
  }, [isDragging]);

  // Determine status per country code
  const regionStatusMap = useMemo(() => {
    // region mapping: { code: { total: number, online: number } }
    const map = new Map<string, { total: number; online: number }>();

    for (const uuid of visibleUuids) {
      const node = snap.byUuid[uuid];
      if (!node || !node.region) continue;

      const code = resolveFlagCode(node.region);
      if (!code) continue;

      if (!map.has(code)) {
        map.set(code, { total: 0, online: 0 });
      }
      const data = map.get(code)!;
      data.total += 1;
      if (node.online) {
        data.online += 1;
      }
    }

    // Convert to status map: { code: "online" | "partial" | "offline" | {count} }
    const statusMap = new Map<string, { status: "online" | "partial" | "offline", count: number }>();
    map.forEach((data, code) => {
      let status: "online" | "partial" | "offline" = "partial";
      if (data.online === data.total) {
        status = "online";
      } else if (data.online === 0) {
        status = "offline";
      }
      statusMap.set(code, { status, count: data.total });
    });

    return statusMap;
  }, [visibleUuids, snap.byUuid]);

  const isVisible = (coords: [number, number], currentRotation: { x: number, y: number }) => {
    const [lon, lat] = coords;
    const centerLon = currentRotation.x;
    const centerLat = currentRotation.y;
    
    const rad = Math.PI / 180;
    const lat1 = lat * rad;
    const lat2 = centerLat * rad;
    const dLon = (lon - centerLon) * rad;
    
    const cosC = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return cosC > 0;
  };

  const getColorByCode = (code: string) => {
    const emptyColor = "color-mix(in srgb, var(--text-primary) 5%, transparent)";
    if (!code) return emptyColor;
    const data = regionStatusMap.get(code);
    if (!data) return emptyColor;
    if (data.status === "online") return customColor || "var(--status-info)";
    if (data.status === "partial") return "var(--status-warning)";
    if (data.status === "offline") return "var(--status-error)";
    return emptyColor;
  };

  const getColor = (geoId: string) => {
    const code = numericToAlpha2[geoId];
    return getColorByCode(code || "");
  };

  return (
    <div className="relative w-full overflow-hidden server-card mt-6 p-4 flex justify-center items-center h-[400px] sm:h-[550px]">
      <div 
        ref={containerRef}
        className="w-full h-full relative cursor-grab active:cursor-grabbing transition-transform duration-75 select-none"
        style={{ transform: `scale(${zoom})`, transformOrigin: "center center", touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseMove={handleMouseMove}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleMouseUp}
        onTouchMove={handleMouseMove}
        onTouchCancel={handleMouseUp}
      >
        <ComposableMap
          projection="geoOrthographic"
          projectionConfig={{ scale: 190, rotate: [-rotation.x, -rotation.y, 0] }}
          width={800}
          height={400}
          style={{ width: "100%", height: "100%", pointerEvents: "none" }}
        >
          <Sphere id="sphere" stroke="color-mix(in srgb, var(--border) 50%, transparent)" strokeWidth={0.5} fill="transparent" />
          <Graticule stroke="color-mix(in srgb, var(--border) 50%, transparent)" strokeWidth={0.5} opacity={0.5} />
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
                    default: { outline: "none", transition: "fill 250ms" },
                    hover: {
                      fill: regionStatusMap.has(numericToAlpha2[geo.id]!) ? getColor(geo.id) : "var(--border)",
                      outline: "none",
                      cursor: "pointer",
                    },
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          {/* Render flag markers for all active regions */}
          {Array.from(regionStatusMap.entries()).map(([code, data]) => {
            const coords = countryCentroids[code];
            if (coords && isVisible(coords, rotation)) {
              return (
                <Marker key={`marker-${code}`} coordinates={coords}>
                  <foreignObject x="-25" y="-14" width="50" height="28" style={{ overflow: 'visible' }}>
                    <div 
                      className="flex items-center bg-[var(--bg-card)] rounded-full px-1.5 py-0.5 w-max gap-1.5 absolute left-1/2 -translate-x-1/2 select-none pointer-events-none transition-colors"
                      style={{
                        border: `1px solid ${data.status === 'online' || data.status === 'partial' ? getColorByCode(code) : 'var(--border-subtle)'}`,
                        boxShadow: data.status === 'online' || data.status === 'partial' ? `0 0 8px 0 color-mix(in srgb, ${getColorByCode(code)} 40%, transparent)` : 'var(--shadow-md)',
                      }}
                    >
                      <div className="w-3.5 h-3.5 flex items-center justify-center overflow-hidden rounded-sm">
                        <Flag region={code} size={14} />
                      </div>
                      <span className="text-[10px] font-bold text-[var(--text-primary)] leading-none pt-px pr-0.5">{data.count}</span>
                    </div>
                  </foreignObject>
                </Marker>
              );
            }
            return null;
          })}
        </ComposableMap>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[var(--surface)]/80 backdrop-blur-md border border-[var(--border)] rounded-lg p-3 flex flex-col gap-2 text-xs font-medium text-[var(--text-secondary)] pointer-events-none">
        <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: customColor || "var(--status-info)" }}></div>
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

      {/* Zoom Controls */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 pointer-events-auto">
        <button 
          onClick={() => setZoom(z => Math.min(3, z + 0.3))} 
          className="w-8 h-8 flex items-center justify-center bg-[var(--surface)]/80 backdrop-blur-md border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] shadow-sm font-bold text-lg leading-none"
        >
          +
        </button>
        <button 
          onClick={() => setZoom(z => Math.max(1, z - 0.3))} 
          className="w-8 h-8 flex items-center justify-center bg-[var(--surface)]/80 backdrop-blur-md border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] shadow-sm font-bold text-lg leading-none"
        >
          -
        </button>
      </div>
    </div>
  );
}
