import { useState } from "react";
import { X, RefreshCw, Calculator } from "lucide-react";
import { clsx } from "clsx";
import { useValueStats, TARGET_CURRENCIES, type TargetCurrency } from "@/hooks/useValueStats";

interface ValueCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ValueCalculator({ isOpen, onClose }: ValueCalculatorProps) {
  const [targetCurrency, setTargetCurrency] = useState<TargetCurrency>("CNY");
  const [filterType, setFilterType] = useState<"all" | "valid" | "invalid" | "expired">("all");

  const {
    ratesData,
    loadingRates,
    errorRates,
    triggerFetchRates,
    validNodes,
    invalidNodes,
    expiredNodes,
    totalResidual,
    totalValue,
    totalMonthlyCost
  } = useValueStats(targetCurrency);

  if (!isOpen) return null;

  const currentList = 
    filterType === "all" ? [...validNodes, ...invalidNodes, ...expiredNodes] :
    filterType === "valid" ? validNodes :
    filterType === "invalid" ? invalidNodes :
    expiredNodes;

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
                onClick={triggerFetchRates} 
                disabled={loadingRates}
                className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw size={14} className={clsx(loadingRates && "animate-spin")} />
                刷新汇率
              </button>

              <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-full p-1 gap-1 shadow-sm">
                {TARGET_CURRENCIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setTargetCurrency(c)}
                    className={clsx(
                      "px-3.5 py-1 text-[11px] font-bold rounded-full transition-all whitespace-nowrap tracking-wide",
                      targetCurrency === c 
                        ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-md" 
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
                {targetCurrency} {totalResidual.toFixed(2)}
              </div>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
              <div className="text-[13px] text-[var(--text-secondary)] mb-1">总价值</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {targetCurrency} {totalValue.toFixed(2)}
              </div>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 shadow-sm">
              <div className="text-[13px] text-[var(--text-secondary)] mb-1">月成本</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {targetCurrency} {totalMonthlyCost.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-full p-1 w-fit">
            {[
              { id: "all", label: "全部", count: validNodes.length + invalidNodes.length + expiredNodes.length },
              { id: "valid", label: "可计算", count: validNodes.length },
              { id: "invalid", label: "未纳入", count: invalidNodes.length },
              { id: "expired", label: "已过期", count: expiredNodes.length },
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
