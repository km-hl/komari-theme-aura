import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { useNode } from "@/hooks/useNode";
import { InstanceDetails } from "@/components/instance/InstanceDetails";
import { LoadChart } from "@/components/instance/LoadChart";
import { Flag } from "@/components/ui/Flag";
import { OsIcon } from "@/components/ui/OsIcon";
import { clsx } from "clsx";
import {
  formatBytes,
  formatExpireDays,
  formatOfflineDuration,
  formatTrafficRate,
  formatUptimeDays,
} from "@/utils/format";
import { getExpireTextColor } from "@/utils/expireStatus";

interface NodeTableProps {
  uuids: string[];
}

export function NodeTable({ uuids }: NodeTableProps) {
  if (uuids.length === 0) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-[var(--text-tertiary)]">
        <span className="text-[15px]">未找到匹配的节点或尚未连接到任何节点</span>
        <span className="text-[12px]">请尝试更改搜索条件或等待后端推送</span>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-sm">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-[13px] text-[var(--text-tertiary)]">
            <th className="font-medium px-4 py-3 w-[4%] text-center"></th>
            <th className="font-medium px-4 py-3 w-[16%]">节点名称</th>
            <th className="font-medium px-4 py-3 text-center w-[10%]">操作系统</th>
            <th className="font-medium px-4 py-3 w-[8%]">状态</th>
            <th className="font-medium px-4 py-3 text-center w-[8%]">CPU</th>
            <th className="font-medium px-4 py-3 text-center w-[12%]">内存</th>
            <th className="font-medium px-4 py-3 text-center w-[12%]">磁盘</th>
            <th className="font-medium px-4 py-3 w-[12%]">价格信息</th>
            <th className="font-medium px-4 py-3 w-[10%]">实时网络</th>
            <th className="font-medium px-4 py-3 w-[10%]">总传输量</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {uuids.map((uuid) => (
            <NodeTableRow key={uuid} uuid={uuid} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const NodeTableRow = memo(function NodeTableRow({ uuid }: { uuid: string }) {
  const node = useNode(uuid);

  const [isExpanded, setIsExpanded] = useState(false);

  if (!node) {
    return (
      <tr className="animate-pulse">
        <td colSpan={10} className="h-[68px] bg-[var(--bg-card-hover)]" />
      </tr>
    );
  }

  const expire = formatExpireDays(node.expired_at);
  const uptime = formatUptimeDays(node.uptime);
  const upRate = formatTrafficRate(node.netUp);
  const downRate = formatTrafficRate(node.netDown);
  const isOnline = node.online === true;
  const isOffline = node.online === false;
  const offlineFor = isOffline ? formatOfflineDuration(node.updatedAt) : null;

  return (
    <>
    <tr 
      className="hover:bg-[var(--bg-card-hover)] transition-colors group cursor-pointer"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Expand Toggle */}
      <td className="px-4 py-3 align-middle text-center text-[var(--text-tertiary)]">
        <ChevronRight size={16} className={clsx("transition-transform mx-auto", isExpanded && "rotate-90")} />
      </td>

      {/* Name */}
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-2">
          <Flag region={node.region} size={16} />
          <div className="flex flex-col">
            <Link
              to={`/instance/${node.uuid}`}
              className="text-[14px] font-semibold text-[var(--text-primary)] hover:text-blue-400 transition-colors truncate max-w-[150px]"
              title={node.name}
            >
              {node.name}
            </Link>
            <span className="text-[12px] text-[var(--text-tertiary)]">
              {isOnline ? `${uptime.value} ${uptime.unit}` : offlineFor ? `${offlineFor.value}${offlineFor.unit}` : "未知"}
            </span>
          </div>
        </div>
      </td>

      {/* OS */}
      <td className="px-4 py-3 align-middle text-center text-[var(--text-secondary)]">
        <span className="inline-block" title={node.os || "-"}>
          <OsIcon os={node.os} className="w-5 h-5 mx-auto" />
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3 align-middle">
        <div className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shadow-sm"
            style={{
              background: node.online == null ? "var(--text-tertiary)" : isOnline ? "var(--status-online)" : "var(--status-offline)",
              boxShadow: `0 0 0 2px color-mix(in srgb, ${
                node.online == null ? "var(--text-tertiary)" : isOnline ? "var(--status-online)" : "var(--status-offline)"
              } 20%, transparent)`
            }}
          />
          <span className={clsx("text-[13px] font-medium", isOnline ? "text-[var(--status-online)]" : isOffline ? "text-[var(--status-offline)]" : "text-[var(--text-tertiary)]")}>
            {node.online == null ? "同步中" : isOnline ? "在线" : "离线"}
          </span>
        </div>
      </td>

      {/* CPU */}
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="h-[6px] w-12 bg-[var(--progress-bg)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--text-primary)] rounded-full" style={{ width: `${Math.min(100, node.cpuPct)}%` }} />
          </div>
          <div className="text-[12px] font-bold text-[#3b82f6] tabular-nums leading-none">
            {node.cpuPct.toFixed(0)}%
          </div>
        </div>
      </td>

      {/* RAM */}
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="h-[6px] w-12 bg-[var(--progress-bg)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--text-primary)] rounded-full" style={{ width: `${Math.min(100, node.ramPct)}%` }} />
          </div>
          <div className="text-[12px] font-bold text-[#3b82f6] tabular-nums leading-none">
            {node.ramPct.toFixed(0)}%
          </div>
          <div className="text-[11px] text-[var(--text-tertiary)] tabular-nums leading-none scale-90 whitespace-nowrap">
            {formatBytes(node.ramUsed)} / {formatBytes(node.ramTotal)}
          </div>
        </div>
      </td>

      {/* Disk */}
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="h-[6px] w-12 bg-[var(--progress-bg)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--text-primary)] rounded-full" style={{ width: `${Math.min(100, node.diskPct)}%` }} />
          </div>
          <div className="text-[12px] font-bold text-[#3b82f6] tabular-nums leading-none">
            {node.diskPct.toFixed(0)}%
          </div>
          <div className="text-[11px] text-[var(--text-tertiary)] tabular-nums leading-none scale-90 whitespace-nowrap">
            {formatBytes(node.diskUsed)} / {formatBytes(node.diskTotal)}
          </div>
        </div>
      </td>

      {/* Price / Info */}
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col gap-1">
          {node.price > 0 ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)] text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium">
                {node.currency || "¥"}{node.price}/{node.billing_cycle || "周期"}
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-[color-mix(in_srgb,var(--status-online)_10%,transparent)] border border-[color-mix(in_srgb,var(--status-online)_20%,transparent)]" style={{ color: getExpireTextColor(node.expired_at) }}>
                余 {expire.value} 天
              </span>
            </div>
          ) : (
            <span className="text-[12px] text-[var(--text-tertiary)]">-</span>
          )}
        </div>
      </td>

      {/* Network Live */}
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 text-[11px] text-[var(--progress-cpu)] tabular-nums">
            <ArrowUp size={11} strokeWidth={2.5} />
            <span>{upRate.value} {upRate.unit}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--status-success)] tabular-nums">
            <ArrowDown size={11} strokeWidth={2.5} />
            <span>{downRate.value} {downRate.unit}</span>
          </div>
        </div>
      </td>

      {/* Total Traffic */}
      <td className="px-4 py-3 align-middle">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] text-[var(--text-secondary)]">
            <span className="text-[var(--text-tertiary)] mr-1">出</span>
            {formatBytes(node.trafficUp)}
          </div>
          <div className="text-[11px] text-[var(--text-secondary)]">
            <span className="text-[var(--text-tertiary)] mr-1">入</span>
            {formatBytes(node.trafficDown)}
          </div>
        </div>
      </td>
    </tr>
    {isExpanded && (
      <tr className="bg-[color-mix(in_srgb,var(--bg-card-hover)_60%,transparent)]">
        <td colSpan={10} className="p-4 border-b border-[var(--border-subtle)]">
          <div className="flex flex-col gap-4">
            <InstanceDetails uuid={uuid} />
            <div className="w-full py-2">
              <LoadChart uuid={uuid} hours={24} active={true} />
            </div>
          </div>
        </td>
      </tr>
    )}
    </>
  );
});
