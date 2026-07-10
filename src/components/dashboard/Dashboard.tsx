import { useEffect, useState } from "react";
import { Clock, Server, Activity, ArrowUp, ArrowDown, Map } from "lucide-react";
import { useGlobalStats } from "@/hooks/useNode";
import { formatBytes } from "@/utils/format";
import WorldMap from "./WorldMap";
import { useValueStats } from "@/hooks/useValueStats";
import { VisitorCard } from "./VisitorCard";

export function Dashboard() {
  const stats = useGlobalStats();
  const [currency, setCurrency] = useState<"CNY" | "USD">("CNY");
  const { totalResidual, totalMonthlyCost, loadingRates } = useValueStats(currency);
  const [showMap, setShowMap] = useState(false);
  const [isYearlyCost, setIsYearlyCost] = useState(false);
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        
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
        <div 
          className="server-card p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-[var(--color-primary)] transition-colors"
          onClick={() => setShowMap(!showMap)}
          title="点击切换世界地图"
        >
          <div className="absolute top-4 right-4 text-[var(--text-tertiary)] opacity-30 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all">
            <Map size={16} />
          </div>
          <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
            {stats.uniqueRegions}
          </div>
          <div className="text-[13px] text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
            覆盖区域
            <span className="text-[10px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-tertiary)]">
              {showMap ? "隐藏地图" : "显示地图"}
            </span>
          </div>
        </div>

        {/* Traffic & Speed Card */}
        <div className="server-card p-5 flex flex-col justify-between relative overflow-hidden group">
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

        {/* Residual Value Card */}
        <div className="server-card p-5 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-4 right-4 text-[var(--text-tertiary)] opacity-30 group-hover:opacity-100 transition-opacity">
            <span className="font-bold">{currency === "CNY" ? "¥" : "$"}</span>
          </div>
          <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
            {loadingRates ? "-" : totalResidual.toFixed(0)}
          </div>
          <div className="text-[13px] text-[var(--text-secondary)] font-medium">
            总剩余价值 ({currency})
          </div>
        </div>

        {/* Cost Card */}
        <div 
          className="server-card p-5 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-[var(--color-primary)] transition-colors"
          onClick={() => setIsYearlyCost(!isYearlyCost)}
          title="点击切换 月/年 成本"
        >
          <div 
            className="absolute top-4 right-4 text-[var(--text-tertiary)] opacity-30 group-hover:opacity-100 group-hover:text-[var(--color-primary)] transition-all z-10"
            onClick={(e) => {
              e.stopPropagation();
              setCurrency(c => c === "CNY" ? "USD" : "CNY");
            }}
            title="点击切换币种"
          >
            <span className="font-bold">{currency === "CNY" ? "¥" : "$"}</span>
          </div>
          <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
            {loadingRates ? "-" : isYearlyCost ? (totalMonthlyCost * 12).toFixed(0) : totalMonthlyCost.toFixed(0)}
          </div>
          <div className="text-[13px] text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
            {isYearlyCost ? "年成本" : "月成本"} ({currency})
            <span className="text-[10px] bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-[var(--text-tertiary)]">
              切换{isYearlyCost ? "月" : "年"}
            </span>
          </div>
        </div>

        <VisitorCard />

      </div>
      {showMap && <WorldMap />}
    </div>
  );
}
