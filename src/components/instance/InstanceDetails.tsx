import { useEffect, useRef, type ReactNode } from "react";
import { useNode } from "@/hooks/useNode";
import { Flag } from "@/components/ui/Flag";
import { getExpireTextColor } from "@/utils/expireStatus";
import { formatBytes, formatExpireDays, formatUptimeDays } from "@/utils/format";
import { getTrafficLimitUsage } from "@/utils/trafficLimit";
import { InstancePanel } from "./InstancePanel";

function formatBillingCycle(cycle: string | null | undefined) {
  if (!cycle) return "周期";
  const value = String(cycle);
  const labels: Record<string, string> = {
    "1": "天",
    "30": "月",
    "90": "季",
    "180": "半年",
    "365": "年",
    "730": "2 年",
    "1095": "3 年",
  };
  return labels[value] ?? `${value} 天`;
}

function formatPrice({
  price,
  currency,
  billingCycle,
}: {
  price: number;
  currency: string;
  billingCycle?: string | null;
}) {
  if (!Number.isFinite(price) || price <= 0) return "—";
  const symbol = currency === "USD" ? "$" : currency === "CNY" ? "¥" : currency || "";
  const gap = symbol && /^[A-Z]{3}$/.test(symbol) ? " " : "";
  return `${symbol}${gap}${price.toFixed(price % 1 === 0 ? 0 : 2)} / ${formatBillingCycle(billingCycle)}`;
}

export function InstanceDetails({
  uuid,
  onNodeReady,
}: {
  uuid: string;
  onNodeReady?: () => (() => void) | void;
}) {
  const node = useNode(uuid);
  const hasAlignedOnReadyRef = useRef(false);

  useEffect(() => {
    hasAlignedOnReadyRef.current = false;
  }, [uuid]);

  useEffect(() => {
    if (!node || hasAlignedOnReadyRef.current) return;
    hasAlignedOnReadyRef.current = true;
    return onNodeReady?.();
  }, [node, onNodeReady]);

  if (!node) return null;

  const isOnline = node.online;
  const uptime = formatUptimeDays(node.uptime);
  const expire = formatExpireDays(node.expired_at);
  const expireText = `${expire.value}${expire.unit ? ` ${expire.unit}` : ""}`;
  const trafficLimit = getTrafficLimitUsage({
    up: node.trafficUp,
    down: node.trafficDown,
    limit: node.traffic_limit,
    type: node.traffic_limit_type,
  });
  const lastUpdated =
    node.updatedAt > 0
      ? new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(node.updatedAt)
      : "—";

  return (
    <InstancePanel
      title="实例信息"
      description={
        isOnline ? undefined : "节点当前离线，以下展示最近一次上报的缓存数据。"
      }
    >
      <header className="instance-hero-header is-inside-panel">
        <div className="instance-hero-title-block">
          <div className="instance-hero-title-row">
            <Flag region={node.region} size={26} />
            <h1 className="instance-hero-title">{node.name}</h1>
          </div>
          <p className="instance-hero-subtitle">
            {[node.os, node.arch, node.virtualization].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
      </header>
      <div className="instance-info-groups">
        <div className="instance-info-group">
          <div className="instance-info-group-title">系统</div>
          <InfoRow label="状态" value={isOnline ? "在线" : "离线"} />
          <InfoRow
            label="CPU"
            value={`${node.cpu_name || "—"}${node.cpu_cores > 0 ? ` (x${node.cpu_cores})` : ""}`}
          />
          <InfoRow label="架构" value={node.arch || "—"} />
          <InfoRow label="虚拟化" value={node.virtualization || "—"} />
          <InfoRow label="显卡" value={node.gpu_name || "—"} />
          <InfoRow label="操作系统" value={node.os || "—"} />
        </div>

        <div className="instance-info-group">
          <div className="instance-info-group-title">资源</div>
          <InfoRow label="内存" value={`${formatBytes(node.ramUsed)} / ${formatBytes(node.ramTotal)}`} />
          <InfoRow
            label="Swap"
            value={
              node.swapTotal > 0
                ? `${formatBytes(node.swapUsed)} / ${formatBytes(node.swapTotal)}`
                : "无"
            }
          />
          <InfoRow label="磁盘" value={`${formatBytes(node.diskUsed)} / ${formatBytes(node.diskTotal)}`} />
          <InfoRow
            label="负载"
            value={`${node.load1.toFixed(2)} | ${node.load5.toFixed(2)} | ${node.load15.toFixed(2)}`}
          />
          <InfoRow
            label="运行时长"
            value={uptime.unit ? `${uptime.value} ${uptime.unit}` : uptime.value}
          />
        </div>

        <div className="instance-info-group">
          <div className="instance-info-group-title">网络</div>
          <InfoRow
            label={isOnline ? "实时网络" : "缓存网络"}
            value={`↑ ${formatBytes(node.netUp)}/s · ↓ ${formatBytes(node.netDown)}/s`}
          />
          <InfoRow label={isOnline ? "最近更新" : "最后上报"} value={lastUpdated} />
          <div className="instance-info-item is-stack">
            <span className="instance-info-label">总流量</span>
            <div className="instance-info-traffic">
              <span className="instance-info-value">{`↑ ${formatBytes(node.trafficUp)} · ↓ ${formatBytes(node.trafficDown)}`}</span>
              {trafficLimit && (
                <>
                  <div className="instance-progress-track" aria-hidden>
                    <span
                      className="instance-progress-fill"
                      style={{ width: `${trafficLimit.fraction * 100}%` }}
                    />
                  </div>
                  <span className="instance-info-note">
                    {trafficLimit.summary}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="instance-info-group">
          <div className="instance-info-group-title">服务</div>
          <InfoRow
            label="地区"
            value={
              <span className="instance-service-region" title={node.region || undefined}>
                <Flag region={node.region} size={16} />
                {!node.region ? <span>—</span> : null}
              </span>
            }
          />
          <InfoRow
            label="到期"
            value={
              <span className="instance-service-expire" style={{ color: getExpireTextColor(node.expired_at) }}>
                {expireText}
                {node.auto_renewal ? <span className="instance-service-renewal">自动续费</span> : null}
              </span>
            }
          />
          <InfoRow
            label="价格"
            value={formatPrice({
              price: node.price,
              currency: node.currency,
              billingCycle: node.billing_cycle,
            })}
          />
        </div>
      </div>
    </InstancePanel>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="instance-info-item">
      <span className="instance-info-label">{label}</span>
      <div className="instance-info-value">{value}</div>
    </div>
  );
}
