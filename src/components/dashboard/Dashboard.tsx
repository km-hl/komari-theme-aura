import { useEffect, useState } from "react";
import { Clock, Server, MapPin, Activity, ArrowUp, ArrowDown } from "lucide-react";
import { useGlobalStats } from "@/hooks/useNode";
import { formatBytes } from "@/utils/format";

export function Dashboard() {
  const stats = useGlobalStats();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-CN", { hour12: false });
  };

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">仪表盘</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        
        {/* Time Card */}
        <div className="server-card p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-[var(--text-tertiary)] opacity-30 group-hover:opacity-100 transition-opacity">
            <Clock size={16} />
          </div>
          <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1 tabular-nums">
            {formatTime(time)}
          </div>
          <div className="text-[13px] text-[var(--text-secondary)] font-medium">
            当前时间
          </div>
        </div>

        {/* Nodes Card */}
        <div className="server-card p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-[var(--text-tertiary)] opacity-30 group-hover:opacity-100 transition-opacity">
            <Activity size={16} />
          </div>
          <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
            {stats.onlineCount} / {stats.totalCount}
          </div>
          <div className="text-[13px] text-[var(--text-secondary)] font-medium">
            当前在线
          </div>
        </div>

        {/* Regions Card */}
        <div className="card-base p-5 flex flex-col justify-between rounded-xl relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-[var(--text-tertiary)] opacity-30 group-hover:opacity-100 transition-opacity">
            <MapPin size={16} />
          </div>
          <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
            {stats.uniqueRegions}
          </div>
          <div className="text-[13px] text-[var(--text-secondary)] font-medium">
            覆盖区域
          </div>
        </div>

        {/* Traffic & Speed Card */}
        <div className="card-base p-5 flex flex-col justify-between rounded-xl relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-[var(--text-tertiary)] opacity-30 group-hover:opacity-100 transition-opacity">
            <Server size={16} />
          </div>
          <div className="flex gap-4 lg:gap-8 justify-between lg:justify-start">
            <div>
              <div className="flex flex-col mb-1 gap-1">
                <span className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                  <ArrowUp size={14} className="text-[var(--color-success)]" /> 
                  {formatBytes(stats.totalTrafficUp)}
                </span>
                <span className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                  <ArrowDown size={14} className="text-[var(--color-info)]" /> 
                  {formatBytes(stats.totalTrafficDown)}
                </span>
              </div>
              <div className="text-[12px] text-[var(--text-secondary)] font-medium">总流量</div>
            </div>
            <div className="w-px h-auto bg-[var(--border-subtle)] my-2"></div>
            <div>
              <div className="flex flex-col mb-1 gap-1">
                <span className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                  <ArrowUp size={14} className="text-[var(--color-success)]" /> 
                  {formatBytes(stats.currentNetUp)}/s
                </span>
                <span className="text-[16px] font-bold text-[var(--text-primary)] flex items-center gap-1.5 tabular-nums">
                  <ArrowDown size={14} className="text-[var(--color-info)]" /> 
                  {formatBytes(stats.currentNetDown)}/s
                </span>
              </div>
              <div className="text-[12px] text-[var(--text-secondary)] font-medium">当前速率</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
