import { useEffect, useState, useMemo, useSyncExternalStore } from "react";
import { X, RefreshCw, Calculator } from "lucide-react";
import { getSnapshot, subscribe } from "@/services/wsStore";
import { useVisibleNodeUuids } from "@/hooks/useNode";
import { clsx } from "clsx";

const TARGET_CURRENCIES = ["USD", "CNY", "EUR", "GBP"] as const;
type TargetCurrency = typeof TARGET_CURRENCIES[number];

interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

function parseCycleDays(cycle: string | null | undefined): number {
  if (!cycle) return 0;
  const c = cycle.toLowerCase().trim();
  if (c === "monthly" || c === "月付") return 30;
  if (c === "quarterly" || c === "季付") return 90;
  if (c === "half-yearly" || c === "半年付") return 180;
  if (c === "yearly" || c === "年付") return 365;
  if (c === "two-yearly" || c === "两年付") return 730;
  if (c === "three-yearly" || c === "三年付") return 1095;
  const num = parseInt(c, 10);
  if (!isNaN(num) && num > 0) return num;
  return 0;
}

function getRemainingDays(expiredAt: string | null | undefined): number {
  if (!expiredAt) return 0;
  let date: Date;
  if (/^\d+$/.test(expiredAt)) {
    const num = parseInt(expiredAt, 10);
    date = new Date(num < 1e11 ? num * 1000 : num);
  } else {
    date = new Date(expiredAt);
  }
  const diff = date.getTime() - Date.now();
  return diff > 0 ? diff / (1000 * 60 * 60 * 24) : 0;
}

function normalizeCurrency(c: string | null | undefined): string {
  if (!c) return "CNY";
  const upper = c.trim().toUpperCase();
  if (upper.includes("CNY") || upper.includes("￥") || upper.includes("RMB")) return "CNY";
  if (upper.includes("USD") || upper.includes("$")) return "USD";
  if (upper.includes("EUR") || upper.includes("€")) return "EUR";
  if (upper.includes("GBP") || upper.includes("£")) return "GBP";
  if (upper.includes("JPY") || upper.includes("¥")) return "JPY";
  return upper.substring(0, 3) || "CNY";
}

interface ValueCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ValueCalculator({ isOpen, onClose }: ValueCalculatorProps) {
  const [targetCurrency, setTargetCurrency] = useState<TargetCurrency>("CNY");
  const [ratesData, setRatesData] = useState<ExchangeRates | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);
  const [errorRates, setErrorRates] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "valid" | "invalid" | "expired">("all");

  const visibleUuids = useVisibleNodeUuids();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const fetchRates = async () => {
    setLoadingRates(true);
    setErrorRates(null);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();
      setRatesData({
        base: data.base_code,
        date: new Date().toLocaleString(undefined, { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        rates: data.rates
      });
    } catch (e) {
      setErrorRates("获取汇率失败，部分货币可能无法换算");
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    if (isOpen && !ratesData && !loadingRates) {
      fetchRates();
    }
  }, [isOpen]);

  const convertCurrency = (amount: number, from: string, to: string) => {
    if (from === to) return amount;
    if (!ratesData) return amount; // Fallback if rates failed
    const rates = ratesData.rates;
    const base = ratesData.base;
    let amountInBase = amount;
    if (from !== base) {
      const fromRate = rates[from];
      if (!fromRate) return 0; // Unsupported currency
      amountInBase = amount / fromRate;
    }
    if (to === base) return amountInBase;
    const toRate = rates[to];
    if (!toRate) return 0;
    return amountInBase * toRate;
  };

  const nodeStats = useMemo(() => {
    const validNodes: any[] = [];
    const invalidNodes: any[] = [];
    const expiredNodes: any[] = [];

    let totalResidual = 0;
    let totalValue = 0;
    let totalMonthlyCost = 0;

    for (const uuid of visibleUuids) {
      const node = snap.byUuid[uuid];
      if (!node) continue;
      
      const price = node.price || 0;
      const cycleDays = parseCycleDays(node.billing_cycle);
      const remainingDays = getRemainingDays(node.expired_at);
      const currency = normalizeCurrency(node.currency);

      if (price <= 0 || cycleDays <= 0) {
        invalidNodes.push({ node, reason: "缺失价格或周期" });
        continue;
      }
      
      const convertedPrice = convertCurrency(price, currency, targetCurrency);
      if (convertedPrice === 0 && currency !== targetCurrency) {
        invalidNodes.push({ node, reason: `不支持的货币: ${currency}` });
        continue;
      }

      if (remainingDays <= 0) {
        expiredNodes.push({ node, convertedPrice, cycleDays });
        continue;
      }

      const dailyCost = convertedPrice / cycleDays;
      const residualValue = dailyCost * remainingDays;
      const monthlyCost = dailyCost * 30;

      totalResidual += residualValue;
      totalValue += convertedPrice;
      totalMonthlyCost += monthlyCost;

      validNodes.push({
        node,
        convertedPrice,
        cycleDays,
        remainingDays,
        residualValue,
        currency,
        price
      });
    }
    
    // Sort valid nodes by residual value descending
    validNodes.sort((a, b) => b.residualValue - a.residualValue);

    return { validNodes, invalidNodes, expiredNodes, totalResidual, totalValue, totalMonthlyCost };
  }, [visibleUuids, snap.byUuid, targetCurrency, ratesData]);

  if (!isOpen) return null;

  const currentList = 
    filterType === "all" ? [...nodeStats.validNodes, ...nodeStats.invalidNodes, ...nodeStats.expiredNodes] :
    filterType === "valid" ? nodeStats.validNodes :
    filterType === "invalid" ? nodeStats.invalidNodes :
    nodeStats.expiredNodes;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose}>
      <div 
        className="w-full max-w-3xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-lg">
            <Calculator size={20} />
            <h2>剩余价值计算器</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-card-hover)]">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Control Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-[13px] text-[var(--text-secondary)] space-y-1">
              <div>
                {loadingRates ? "正在更新汇率..." : `汇率更新时间 ${ratesData ? ratesData.date : '未知'}`}
                {errorRates && <span className="text-red-400 ml-2">{errorRates}</span>}
              </div>
              <p className="text-[12px] text-[var(--text-tertiary)]">在线汇率由 ExchangeRate-API 提供，仅会在你打开计算器后发起查询。</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button 
                onClick={fetchRates} 
                disabled={loadingRates}
                className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw size={14} className={clsx(loadingRates && "animate-spin")} />
                刷新汇率
              </button>

              <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-1 gap-1">
                {TARGET_CURRENCIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setTargetCurrency(c)}
                    className={clsx(
                      "px-2.5 py-1 text-[12px] font-medium rounded-md transition-all whitespace-nowrap",
                      targetCurrency === c 
                        ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-sm" 
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
              <div className="text-[13px] text-[var(--text-secondary)] mb-1">全部剩余价值</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {targetCurrency} {nodeStats.totalResidual.toFixed(2)}
              </div>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
              <div className="text-[13px] text-[var(--text-secondary)] mb-1">总价值</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {targetCurrency} {nodeStats.totalValue.toFixed(2)}
              </div>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
              <div className="text-[13px] text-[var(--text-secondary)] mb-1">月成本</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {targetCurrency} {nodeStats.totalMonthlyCost.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-full p-1 w-fit">
            {[
              { id: "all", label: "全部", count: nodeStats.validNodes.length + nodeStats.invalidNodes.length + nodeStats.expiredNodes.length },
              { id: "valid", label: "可计算", count: nodeStats.validNodes.length },
              { id: "invalid", label: "未纳入", count: nodeStats.invalidNodes.length },
              { id: "expired", label: "已过期", count: nodeStats.expiredNodes.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={clsx(
                  "px-3 py-1 text-[12px] font-medium rounded-full transition-all flex items-center gap-1.5",
                  filterType === tab.id 
                    ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-sm" 
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                )}
              >
                <span>{tab.label}</span>
                <span className={clsx(
                  "text-[11px] px-1.5 py-0.5 rounded-full font-bold",
                  filterType === tab.id ? "bg-[color-mix(in_srgb,var(--bg-base)_20%,transparent)]" : "bg-[var(--border-subtle)] text-[var(--text-primary)]"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">可计算节点</h3>

          {/* List */}
          <div className="space-y-3">
            {currentList.length === 0 && (
              <div className="text-center py-10 text-[var(--text-tertiary)] text-sm">
                没有符合条件的节点
              </div>
            )}
            {currentList.map((item: any, i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl gap-4 transition-colors">
                <div className="space-y-1.5">
                  <div className="font-semibold text-[15px] text-[var(--text-primary)]">{item.node.name}</div>
                  
                  {item.reason ? (
                     <div className="text-[13px] text-red-400">无法计算: {item.reason}</div>
                  ) : (
                    <>
                      <div className="text-[13px] text-[var(--text-secondary)]">原价 {item.currency === "CNY" ? "¥" : item.currency === "USD" ? "$" : item.currency}{item.price} / {item.cycleDays} 天</div>
                      <div className="text-[13px] text-[var(--text-secondary)]">
                        剩余时间 {Math.floor(item.remainingDays)} 天 {Math.floor((item.remainingDays % 1) * 24)} 小时
                      </div>
                      <div className="text-[13px] text-[var(--text-tertiary)]">原币种价值 {item.currency} {item.price}</div>
                    </>
                  )}
                </div>
                
                {item.residualValue !== undefined && (
                  <div className="text-right">
                    <div className="font-bold text-[18px] text-[var(--text-primary)]">{targetCurrency} {item.residualValue.toFixed(2)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
