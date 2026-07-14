import { useState } from "react";
import { X, RefreshCw, Calculator, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { useValueStats, TARGET_CURRENCIES, type TargetCurrency, getRemainingDays } from "@/hooks/useValueStats";

interface ValueCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ValueCalculator({ isOpen, onClose }: ValueCalculatorProps) {
  const [targetCurrency, setTargetCurrency] = useState<TargetCurrency>("CNY");
  const [filterType, setFilterType] = useState<"all" | "valid" | "invalid" | "expired">("all");
  const [view, setView] = useState<"residual" | "cost">("residual");

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

  const totalCount = validNodes.length + invalidNodes.length + expiredNodes.length;

  if (!isOpen) return null;

  const currentList = 
    filterType === "all" ? [...validNodes, ...invalidNodes, ...expiredNodes] :
    filterType === "valid" ? validNodes :
    filterType === "invalid" ? invalidNodes :
    expiredNodes;
  const filterTitle = {
    all: "全部节点",
    valid: "可计算节点",
    invalid: "未纳入计算",
    expired: "已过期节点",
  }[filterType];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose}>
      <div 
        className="w-full max-w-3xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-lg">
            <Calculator size={20} />
            <span>计算器</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors rounded-lg hover:bg-[var(--bg-card-hover)]">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-5 sm:space-y-6">
          
          {/* Tabs */}
          <div className="value-pill-group">
            <button
              onClick={() => setView("residual")}
              className={clsx(
                "value-pill-button",
                view === "residual" && "is-active"
              )}
            >
              剩余价值
            </button>
            <button
              onClick={() => setView("cost")}
              className={clsx(
                "value-pill-button",
                view === "cost" && "is-active"
              )}
            >
              成本统计
            </button>
          </div>

          {/* Top Control Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="text-[13px] text-[var(--text-secondary)] space-y-1">
              <div>
                {loadingRates ? "正在更新汇率..." : `汇率更新时间 ${ratesData ? ratesData.date : '未知'}`}
                {errorRates && <span className="text-red-400 ml-2">{errorRates}</span>}
              </div>
              <p className="text-[12px] text-[var(--text-tertiary)]">在线汇率由 Frankfurter 提供，仅会在你打开计算器后发起查询。</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="value-pill-group">
                <button
                  onClick={triggerFetchRates}
                  disabled={loadingRates}
                  className="value-pill-button value-refresh-pill"
                >
                  <RefreshCw size={14} className={clsx(loadingRates && "animate-spin")} />
                  刷新汇率
                </button>
              </div>

              <div className="value-pill-group">
                {TARGET_CURRENCIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setTargetCurrency(c)}
                    className={clsx(
                      "value-pill-button",
                      targetCurrency === c && "is-active"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {view === "residual" ? (
            <div className="flex flex-col gap-4 mb-8">
              <div className="server-card p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
                  {targetCurrency} {loadingRates ? "-" : totalResidual.toFixed(2)}
                </div>
                <div className="text-[13px] text-[var(--text-secondary)] font-medium">
                  全部剩余价值
                </div>
              </div>
              <div className="server-card p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
                  {targetCurrency} {loadingRates ? "-" : totalValue.toFixed(2)}
                </div>
                <div className="text-[13px] text-[var(--text-secondary)] font-medium">
                  总价值
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 mb-8">
              <div className="server-card p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
                  {targetCurrency} {loadingRates ? "-" : totalMonthlyCost.toFixed(2)}
                </div>
                <div className="text-[13px] text-[var(--text-secondary)] font-medium">
                  总月成本
                </div>
              </div>
              <div className="server-card p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-1">
                  {targetCurrency} {loadingRates ? "-" : (totalMonthlyCost * 12).toFixed(2)}
                </div>
                <div className="text-[13px] text-[var(--text-secondary)] font-medium">
                  总年成本
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="value-pill-group value-filter-group">
            {[
              { id: "all", label: "全部", count: totalCount },
              { id: "valid", label: "可计算", count: validNodes.length },
              { id: "invalid", label: "未纳入计算", count: invalidNodes.length },
              { id: "expired", label: "已过期", count: expiredNodes.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={clsx(
                  "value-pill-button value-filter-pill",
                  filterType === tab.id && "is-active"
                )}
              >
                <span>{tab.label}</span>
                <span className={clsx(
                  "value-pill-count",
                  filterType === tab.id && "is-active"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
            {filterTitle}
          </h3>

          {/* List */}
          <div className="space-y-3">
            {currentList.length === 0 && (
              <div className="text-center py-10 text-[var(--text-tertiary)] text-[13px]">
                没有符合条件的节点
              </div>
            )}
            {currentList.map((item: any, i) => {
              const dailyCost = item.price / item.cycleDays;
              let originalYearly = dailyCost * 365;
              if (item.cycleDays === 30) originalYearly = item.price * 12;
              else if (item.cycleDays === 90) originalYearly = item.price * 4;
              else if (item.cycleDays === 180) originalYearly = item.price * 2;
              else if (item.cycleDays === 365) originalYearly = item.price;
              else if (item.cycleDays === 730) originalYearly = item.price / 2;
              else if (item.cycleDays === 1095) originalYearly = item.price / 3;
              const originalMonthly = originalYearly / 12;
              let targetMonthly = 0;
              let targetYearly = 0;
              
              if (item.convertedPrice != null && ratesData) {
                 const rate = (item.currency === targetCurrency) ? 1 : (ratesData.rates[targetCurrency] / ratesData.rates[item.currency]);
                 targetMonthly = originalMonthly * rate;
                 targetYearly = originalYearly * rate;
              }

              return (
                <div key={i} className={clsx(
                  "value-node-card flex flex-col p-3 sm:p-5",
                  item.reason && "opacity-70"
                )}>
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <div className="font-medium text-[15px] text-[var(--text-primary)]">{item.node.name}</div>
                    
                    {!item.reason && (
                      view === "residual" ? (
                        <div className="font-bold text-[15px] text-[var(--text-primary)]">
                          {targetCurrency} {loadingRates ? "-" : item.convertedPrice?.toFixed(2) || (item.convertedPrice === 0 ? "0.00" : "-")}
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="font-bold text-[15px] text-[var(--text-primary)]">
                            {targetCurrency} {loadingRates ? "-" : targetMonthly ? targetMonthly.toFixed(2) : "0.00"} <span className="text-[12px] text-[var(--text-tertiary)] font-normal">/ 月</span>
                          </div>
                          <div className="text-[13px] text-[var(--text-secondary)] mt-0.5">
                            {targetCurrency} {loadingRates ? "-" : targetYearly ? targetYearly.toFixed(2) : "0.00"} <span className="text-[11px] text-[var(--text-tertiary)] font-normal">/ 年</span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  
                  <div className="space-y-1.5 text-[13px] text-[var(--text-tertiary)]">
                    {item.reason ? (
                       <div className="flex items-center gap-1.5 text-red-400/90 mt-2">
                         <AlertCircle size={14} />
                         <span>无法计算: {item.reason}</span>
                       </div>
                    ) : (
                      <>
                        <div>
                          原价 {item.currency === "USD" ? "$" : item.currency === "CNY" ? "¥" : `${item.currency} `}{item.price} / {item.cycleDays} 天
                        </div>
                        {view === "residual" && (
                          <>
                            <div>
                              剩余时间 {
                                Math.floor(getRemainingDays(item.node.expired_at))
                              } 天
                            </div>
                            <div>
                              原币种价值 {item.currency} {(() => {
                                const remainDays = getRemainingDays(item.node.expired_at);
                                return (dailyCost * remainDays).toFixed(2);
                              })()}
                            </div>
                          </>
                        )}
                        {view === "cost" && (
                          <>
                            <div>
                              原币种成本 {item.currency} {originalMonthly.toFixed(2)} / 月，{item.currency} {originalYearly.toFixed(2)} / 年
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
