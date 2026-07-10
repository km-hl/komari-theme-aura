import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "@/services/wsStore";
import { useVisibleNodeUuids } from "@/hooks/useNode";
import { usePublicConfig } from "@/hooks/usePublicConfig";

export const TARGET_CURRENCIES = ["USD", "CNY", "EUR", "GBP"] as const;
export type TargetCurrency = typeof TARGET_CURRENCIES[number];

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export function parseCycleDays(cycle: string | null | undefined): number {
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

export function getRemainingDays(expiredAt: string | null | undefined): number {
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

export function normalizeCurrency(c: string | null | undefined): string {
  if (!c) return "CNY";
  const upper = c.trim().toUpperCase();
  if (upper.includes("CNY") || upper.includes("￥") || upper.includes("RMB")) return "CNY";
  if (upper.includes("USD") || upper.includes("$")) return "USD";
  if (upper.includes("EUR") || upper.includes("€")) return "EUR";
  if (upper.includes("GBP") || upper.includes("£")) return "GBP";
  if (upper.includes("JPY") || upper.includes("¥")) return "JPY";
  return upper.substring(0, 3) || "CNY";
}

let globalRatesCache: ExchangeRates | null = null;
let globalRatesPromise: Promise<ExchangeRates | null> | null = null;

export const fetchGlobalRates = async (customApi?: string): Promise<ExchangeRates | null> => {
  console.log("[fetchGlobalRates] called, cache=", globalRatesCache);
  if (globalRatesCache) return globalRatesCache;
  if (globalRatesPromise) return globalRatesPromise;

  const url = customApi || "https://api.frankfurter.dev/v1/latest?from=USD";

  globalRatesPromise = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error("Failed to fetch rates");
      const data = await res.json();
      
      if (Array.isArray(data)) {
        const rates = {
          base: "USD",
          date: data[0]?.date || new Date().toLocaleString(),
          rates: Object.fromEntries(data.map((item: any) => [item.quote, item.rate]))
        };
        globalRatesCache = rates;
        return rates;
      }

      const rates = {
        base: "USD",
        date: data.date || data.time_last_update_utc || new Date().toLocaleString(),
        rates: {
          USD: 1,
          ...Object.fromEntries(Object.entries(data.rates || data.usd || {}).map(([k, v]) => [k.toUpperCase(), v as number]))
        }
      };
      globalRatesCache = rates;
      return rates;
    })
    .catch(err => {
      console.warn("Failed to load rates", err);
      return null;
    })
    .finally(() => {
      globalRatesPromise = null;
    });


  return globalRatesPromise;
};

export function convertCurrency(amount: number, from: string, to: string, ratesData: ExchangeRates | null) {
  if (from === to) return amount;
  if (!ratesData) return amount; // Fallback
  const rates = ratesData.rates;
  const base = ratesData.base;
  let amountInBase = amount;
  if (from !== base) {
    const fromRate = rates[from];
    if (!fromRate) return 0;
    amountInBase = amount / fromRate;
  }
  if (to === base) return amountInBase;
  const toRate = rates[to];
  if (!toRate) return 0;
  return amountInBase * toRate;
}

export function useValueStats(targetCurrency: TargetCurrency) {
  const visibleUuids = useVisibleNodeUuids();
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const { data: config } = usePublicConfig();
  
  const [ratesData, setRatesData] = useState<ExchangeRates | null>(globalRatesCache);
  const [loadingRates, setLoadingRates] = useState(!globalRatesCache);
  const [errorRates, setErrorRates] = useState<string | null>(null);

  const themeSettings = config?.theme_settings as any;
  const fixedRate = themeSettings?.fixedExchangeRate;
  const customApi = themeSettings?.customExchangeApi;

  const triggerFetchRates = async () => {
    if (fixedRate && !isNaN(parseFloat(fixedRate))) {
      const fixedRatesData = {
        base: "USD",
        date: new Date().toLocaleString(),
        rates: { USD: 1, CNY: parseFloat(fixedRate) }
      };
      setRatesData(fixedRatesData);
      setLoadingRates(false);
      globalRatesCache = fixedRatesData;
      return;
    }

    setLoadingRates(true);
    setErrorRates(null);
    try {
      const rates = await fetchGlobalRates(customApi);
      setRatesData(rates);
    } catch (e) {
      setErrorRates("获取汇率失败");
    } finally {
      setLoadingRates(false);
    }
  };

  useEffect(() => {
    if (!ratesData && !loadingRates) {
      triggerFetchRates();
    }
  }, [config]);

  const stats = useMemo(() => {
    const validNodes: any[] = [];
    const invalidNodes: any[] = [];
    const expiredNodes: any[] = [];

    let totalResidual = 0;
    let totalValue = 0;
    let totalMonthlyCost = 0;

    for (const uuid of visibleUuids) {
      const node = snap.byUuid[uuid];
      if (!node) continue;
      
      const priceStr = String(node.price || 0).replace(/[^\d.-]/g, '');
      const price = parseFloat(priceStr) || 0;
      const cycleDays = parseCycleDays(node.billing_cycle);
      const remainingDays = getRemainingDays(node.expired_at);
      const currency = normalizeCurrency(node.currency);

      if (price <= 0 || cycleDays <= 0) {
        invalidNodes.push({ node, reason: "缺失价格或周期" });
        continue;
      }
      
      const convertedPrice = convertCurrency(price, currency, targetCurrency, ratesData);
      if (convertedPrice === 0 && currency !== targetCurrency) {
        invalidNodes.push({ node, reason: `不支持的货币: ${currency}` });
        continue;
      }

      if (remainingDays <= 0) {
        expiredNodes.push({ node, convertedPrice, cycleDays, currency, price });
        continue;
      }

      const dailyCost = convertedPrice / cycleDays;
      const monthlyCost = dailyCost * 30;

      // Exclude long-term/lifetime items from residual value
      let residualValue = 0;
      if (cycleDays > 1000 || remainingDays > 1500) {
        invalidNodes.push({ node, reason: "长期合约不纳入计算" });
        continue; // Do not add to validNodes, so it won't add to cost either
      } else {
        residualValue = dailyCost * remainingDays;
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
    }
    
    validNodes.sort((a, b) => b.residualValue - a.residualValue);

    return { validNodes, invalidNodes, expiredNodes, totalResidual, totalValue, totalMonthlyCost };
  }, [visibleUuids, snap.byUuid, targetCurrency, ratesData]);

  return {
    ratesData,
    loadingRates,
    errorRates,
    triggerFetchRates,
    ...stats
  };
}
