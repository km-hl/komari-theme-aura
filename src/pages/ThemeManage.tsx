import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  LayoutTemplate,
  Moon,
  RefreshCw,
  Save,
  Search,
  Sun,
  SunMoon,
} from "lucide-react";
import { clsx } from "clsx";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { Spinner } from "@/components/ui/Spinner";
import { Flag } from "@/components/ui/Flag";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { queryClient } from "@/services/queryClient";
import {
  ApiRequestError,
  getAdminClients,
  getAdminPingTasks,
  saveThemeSettings,
} from "@/services/api";
import type { AdminClient, PingTask, ThemeSettings as BaseThemeSettings } from "@/types/komari";

export interface ThemeSettings extends BaseThemeSettings {
  priceTagColor?: string;
}

import {
  normalizeHomepagePingTaskBindings,
  type HomepagePingTaskBindings,
} from "@/utils/pingTasks";

type Appearance = "system" | "light" | "dark";

const APPEARANCE_OPTIONS = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "system", label: "跟随系统", icon: SunMoon },
  { value: "dark", label: "深色", icon: Moon },
] as const;

function normalizeAppearance(value: unknown): Appearance {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function serializeBindings(bindings: HomepagePingTaskBindings) {
  return JSON.stringify(
    Object.entries(bindings)
      .map(
        ([taskId, clients]): [number, string[]] => [
          Number(taskId),
          [...clients].sort((left, right) => left.localeCompare(right)),
        ],
      )
      .filter(([taskId]) => Number.isInteger(taskId) && taskId > 0)
      .sort(([left], [right]) => Number(left) - Number(right)),
  );
}

function sortTasks(tasks: PingTask[]) {
  return [...tasks].sort((left, right) => {
    if (left.weight !== right.weight) return left.weight - right.weight;
    if (left.id !== right.id) return left.id - right.id;
    return left.name.localeCompare(right.name);
  });
}

function sortClients(clients: AdminClient[]) {
  return [...clients].sort((left, right) => {
    if (left.weight !== right.weight) return left.weight - right.weight;
    return left.name.localeCompare(right.name);
  });
}

function summarizeNodes(
  uuids: string[],
  clientsById: Map<string, AdminClient>,
) {
  if (uuids.length === 0) return "未绑定节点";
  const names = uuids.map((uuid) => clientsById.get(uuid)?.name || uuid);
  const summary = names.join("、");
  return summary.length > 92 ? `${summary.slice(0, 92)}...` : summary;
}

function pruneBindings(bindings: HomepagePingTaskBindings) {
  const normalized = normalizeHomepagePingTaskBindings(bindings);
  const pruned: HomepagePingTaskBindings = {};

  for (const [taskId, clients] of Object.entries(normalized)) {
    if (clients.length > 0) {
      pruned[taskId] = clients;
    }
  }

  return pruned;
}

function applyClientAssignment(
  bindings: HomepagePingTaskBindings,
  taskId: number,
  clientUuid: string,
  checked: boolean,
) {
  const taskKey = String(taskId);
  const next = pruneBindings(bindings);

  for (const [currentTaskId, clients] of Object.entries(next)) {
    const filtered = clients.filter((uuid) => uuid !== clientUuid);
    if (filtered.length > 0) {
      next[currentTaskId] = filtered;
    } else {
      delete next[currentTaskId];
    }
  }

  if (checked) {
    const selected = next[taskKey] ?? [];
    next[taskKey] = Array.from(new Set([...selected, clientUuid])).sort((left, right) =>
      left.localeCompare(right),
    );
  }

  return next;
}

export function ThemeManage() {
  const { data: config, isLoading: configLoading } = usePublicConfig();
  const [draftAppearance, setDraftAppearance] = useState<Appearance>("system");
  const [draftBindings, setDraftBindings] = useState<HomepagePingTaskBindings>({});
  const [draftPriceTagColor, setDraftPriceTagColor] = useState<string | undefined>();
  const [draftMapRegionColor, setDraftMapRegionColor] = useState<string | undefined>();
  const [draftWallpaperMode, setDraftWallpaperMode] = useState<"none" | "custom_url" | "custom_upload" | "bing">("none");
  const [draftWallpaperUrl, setDraftWallpaperUrl] = useState("");
  const [draftWallpaperData, setDraftWallpaperData] = useState("");
  const [draftWallpaperOpacity, setDraftWallpaperOpacity] = useState(20);
  const [draftCardOpacity, setDraftCardOpacity] = useState(75);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [nodeSearch, setNodeSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessRevoked, setAccessRevoked] = useState(false);

  const {
    data: pingTasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery({
    queryKey: ["admin", "ping-tasks"],
    queryFn: getAdminPingTasks,
    staleTime: 30_000,
    retry: false,
  });
  const {
    data: adminClients,
    isLoading: clientsLoading,
    error: clientsError,
  } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: getAdminClients,
    staleTime: 30_000,
    retry: false,
  });

  const sourceAppearance = useMemo(
    () => normalizeAppearance(config?.theme_settings?.defaultAppearance),
    [config?.theme_settings?.defaultAppearance],
  );
  const sourcePriceTagColor = useMemo(
    () => (config?.theme_settings as any)?.priceTagColor as string | undefined,
    [config?.theme_settings],
  );
  const sourceMapRegionColor = useMemo(
    () => (config?.theme_settings as any)?.mapRegionColor as string | undefined,
    [config?.theme_settings],
  );
  const sourceWallpaperMode = useMemo(
    () => ((config?.theme_settings as any)?.wallpaperMode as "none" | "custom_url" | "custom_upload" | "bing") || "none",
    [config?.theme_settings],
  );
  const sourceWallpaperUrl = useMemo(
    () => ((config?.theme_settings as any)?.wallpaperUrl as string) || "",
    [config?.theme_settings],
  );
  const sourceWallpaperData = useMemo(
    () => ((config?.theme_settings as any)?.wallpaperData as string) || "",
    [config?.theme_settings],
  );
  const sourceWallpaperOpacity = useMemo(
    () => ((config?.theme_settings as any)?.wallpaperOpacity as number) ?? 20,
    [config?.theme_settings],
  );
  const sourceCardOpacity = useMemo(
    () => ((config?.theme_settings as any)?.cardOpacity as number) ?? 75,
    [config?.theme_settings],
  );
  const sourceBindings = useMemo(
    () => normalizeHomepagePingTaskBindings(config?.theme_settings?.homepagePingBindings),
    [config?.theme_settings?.homepagePingBindings],
  );

  useEffect(() => {
    if (!config) return;
    setDraftAppearance(sourceAppearance);
    setDraftPriceTagColor(sourcePriceTagColor);
    setDraftMapRegionColor(sourceMapRegionColor);
    setDraftBindings(sourceBindings);
    setDraftWallpaperMode(sourceWallpaperMode);
    setDraftWallpaperUrl(sourceWallpaperUrl);
    setDraftWallpaperData(sourceWallpaperData);
    setDraftWallpaperOpacity(sourceWallpaperOpacity);
    setDraftCardOpacity(sourceCardOpacity);
  }, [config, sourceAppearance, sourcePriceTagColor, sourceMapRegionColor, sourceBindings, sourceWallpaperMode, sourceWallpaperUrl, sourceWallpaperData, sourceWallpaperOpacity, sourceCardOpacity]);

  const sortedTasks = useMemo(() => sortTasks(pingTasks ?? []), [pingTasks]);
  const sortedClients = useMemo(() => sortClients(adminClients ?? []), [adminClients]);
  const clientsById = useMemo(
    () => new Map(sortedClients.map((client) => [client.uuid, client])),
    [sortedClients],
  );

  const filteredTasks = useMemo(() => {
    const keyword = taskSearch.trim().toLowerCase();
    if (!keyword) return sortedTasks;
    return sortedTasks.filter((task) => {
      return (
        task.name.toLowerCase().includes(keyword) ||
        String(task.id).includes(keyword) ||
        task.type.toLowerCase().includes(keyword) ||
        task.target.toLowerCase().includes(keyword)
      );
    });
  }, [sortedTasks, taskSearch]);

  const visibleClients = useMemo(() => {
    const keyword = nodeSearch.trim().toLowerCase();
    if (!keyword) return sortedClients;
    return sortedClients.filter((client) => {
      const group = String(client.group || "").toLowerCase();
      const region = String(client.region || "").toLowerCase();
      return (
        client.name.toLowerCase().includes(keyword) ||
        client.uuid.toLowerCase().includes(keyword) ||
        group.includes(keyword) ||
        region.includes(keyword)
      );
    });
  }, [nodeSearch, sortedClients]);

  const draftBindingsSerialized = useMemo(
    () => serializeBindings(draftBindings),
    [draftBindings],
  );
  const sourceBindingsSerialized = useMemo(
    () => serializeBindings(sourceBindings),
    [sourceBindings],
  );
  const isDirty =
    draftAppearance !== sourceAppearance ||
    draftPriceTagColor !== sourcePriceTagColor ||
    draftMapRegionColor !== sourceMapRegionColor ||
    draftWallpaperMode !== sourceWallpaperMode ||
    draftWallpaperUrl !== sourceWallpaperUrl ||
    draftWallpaperData !== sourceWallpaperData ||
    draftWallpaperOpacity !== sourceWallpaperOpacity ||
    draftCardOpacity !== sourceCardOpacity ||
    draftBindingsSerialized !== sourceBindingsSerialized;

  const assignedNodeCount = useMemo(
    () => Object.values(draftBindings).reduce((total, clients) => total + clients.filter(uuid => clientsById.has(uuid)).length, 0),
    [draftBindings, clientsById],
  );

  const handleSave = async () => {
    if (!config?.theme) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const baseSettings = {
        ...(config.theme_settings ?? {}),
      };
      delete (baseSettings as any).homepagePingTask;
      const nextSettings = {
        ...baseSettings,
        defaultAppearance: draftAppearance,
        priceTagColor: draftPriceTagColor,
        mapRegionColor: draftMapRegionColor,
        wallpaperMode: draftWallpaperMode,
        wallpaperUrl: draftWallpaperUrl,
        wallpaperData: draftWallpaperData,
        wallpaperOpacity: draftWallpaperOpacity,
        cardOpacity: draftCardOpacity,
        homepagePingBindings: pruneBindings(draftBindings),
      };
      await saveThemeSettings(config.theme, nextSettings);
      await queryClient.invalidateQueries({ queryKey: ["public"] });
      setMessage("主题设置已保存");
    } catch (saveError) {
      if (
        saveError instanceof ApiRequestError &&
        (saveError.status === 401 || saveError.status === 403)
      ) {
        setAccessRevoked(true);
        return;
      }
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraftAppearance(sourceAppearance);
    setDraftPriceTagColor(sourcePriceTagColor);
    setDraftMapRegionColor(sourceMapRegionColor);
    setDraftWallpaperMode(sourceWallpaperMode);
    setDraftWallpaperUrl(sourceWallpaperUrl);
    setDraftWallpaperData(sourceWallpaperData);
    setDraftWallpaperOpacity(sourceWallpaperOpacity);
    setDraftBindings(sourceBindings);
    setMessage(null);
    setError(null);
  };

  if (configLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  if (accessRevoked) {
    return <Navigate to="/" replace />;
  }

  const adminAccessDenied =
    (tasksError instanceof ApiRequestError &&
      (tasksError.status === 401 || tasksError.status === 403)) ||
    (clientsError instanceof ApiRequestError &&
      (clientsError.status === 401 || clientsError.status === 403));

  if (adminAccessDenied) {
    return <Navigate to="/" replace />;
  }

  const adminError =
    (tasksError instanceof Error ? tasksError.message : null) ||
    (clientsError instanceof Error ? clientsError.message : null);
  const noTasksYet = !tasksLoading && !clientsLoading && sortedTasks.length === 0;
  const noFilteredTaskMatch = !tasksLoading && !clientsLoading && !noTasksYet && filteredTasks.length === 0;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > 1920) {
          height = Math.round((height * 1920) / width);
          width = 1920;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setDraftWallpaperData(dataUrl);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col gap-5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] px-4 py-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all font-medium text-[13px]">
          <ArrowLeft size={14} />
          返回首页
        </Link>
        <div className="theme-manage-toolbar-actions">
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty || saving}
            className="theme-manage-button"
          >
            <RefreshCw size={14} />
            <span>重置</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="theme-manage-button is-primary"
          >
            {saving ? <Spinner size={14} /> : <Save size={14} />}
            <span>{saving ? "保存中" : "保存设置"}</span>
          </button>
        </div>
      </div>

      <InstancePanel
        title="Aura 主题设置"
        description="集中调整 Aura 的展示偏好与首页延迟绑定；保存后会立即应用到当前站点。"
        aside={
          <div className="text-right text-[11px] text-[var(--text-tertiary)]">
            <div>主题: {config?.theme || "Aura"}</div>
            <div>已绑定首页 Ping 节点 {assignedNodeCount} / {sortedClients.length}</div>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {message && (
            <div className="rounded-[12px] border border-[color-mix(in_srgb,var(--status-online)_28%,transparent)] bg-[color-mix(in_srgb,var(--status-online)_11%,var(--surface))] px-4 py-3 text-[13px] text-[var(--status-online)]">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-[12px] border border-[color-mix(in_srgb,var(--status-offline)_28%,transparent)] bg-[color-mix(in_srgb,var(--status-offline)_11%,var(--surface))] px-4 py-3 text-[13px] text-[var(--status-offline)]">
              {error}
            </div>
          )}
          {adminError && (
            <div className="rounded-[12px] border border-[color-mix(in_srgb,var(--status-offline)_28%,transparent)] bg-[color-mix(in_srgb,var(--status-offline)_11%,var(--surface))] px-4 py-3 text-[13px] text-[var(--status-offline)]">
              无法读取后台 Ping 任务或节点列表: {adminError}
            </div>
          )}
        </div>
      </InstancePanel>

      <InstancePanel
        title="默认外观"
        description="为首次访问或尚未手动切换外观的用户设置默认显示模式；后续仍可在首页右上角按需切换。"
        aside={<LayoutTemplate size={16} />}
      >
        <div className="instance-segmented is-scrollable">
          {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              data-active={draftAppearance === value ? "true" : "false"}
              onClick={() => setDraftAppearance(value)}
              className="inline-flex items-center justify-center gap-2"
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </InstancePanel>

      <InstancePanel
        title="节点卡片设置"
        description="自定义节点卡片中价格与计费周期标签的主题颜色。"
        aside={
          <div className="w-5 h-5 rounded-md" style={{ background: draftPriceTagColor || "#a855f7" }} />
        }
      >
        <div className="surface-inset px-4 py-4 flex items-center justify-between">
          <div className="text-[13px] text-[var(--text-primary)]">计费标签颜色</div>
          <div className="flex items-center gap-2">
             {["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"].map(color => (
               <button
                 key={color}
                 type="button"
                 onClick={() => setDraftPriceTagColor(color)}
                 className={clsx(
                   "w-6 h-6 rounded-full border-2 transition-transform",
                   draftPriceTagColor === color ? "border-[var(--text-primary)] scale-110" : "border-transparent hover:scale-110"
                 )}
                 style={{ background: color }}
               />
             ))}
             <input 
               type="color" 
               value={draftPriceTagColor || "#a855f7"} 
               onChange={e => setDraftPriceTagColor(e.target.value)} 
               className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full ml-1" 
             />
             {draftPriceTagColor && (
               <button 
                 type="button"
                 onClick={() => setDraftPriceTagColor(undefined)} 
                 className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors ml-2"
               >
                 恢复默认
               </button>
             )}
          </div>
        </div>
      </InstancePanel>

      <InstancePanel title="地图点亮颜色" description="自定义首页地球仪上在线节点的点亮颜色。">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-[13px] text-[var(--text-secondary)]">
          <div className="flex items-center gap-2 min-w-[100px]">
            地图点亮颜色
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            {["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"].map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setDraftMapRegionColor(color)}
                className="w-6 h-6 rounded-full cursor-pointer transition-all outline-none"
                style={{
                  backgroundColor: color,
                  transform: draftMapRegionColor === color ? "scale(1.2)" : "scale(1)",
                  boxShadow: draftMapRegionColor === color ? `0 0 0 2px var(--bg-base), 0 0 0 4px ${color}` : "none",
                }}
                title={color}
              />
            ))}
            <div className="w-px h-6 bg-[var(--border)] mx-1" />
            <button
              type="button"
              onClick={() => setDraftMapRegionColor(undefined)}
              className="text-[12px] px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-colors"
              style={{
                borderColor: !draftMapRegionColor ? "var(--text-primary)" : "var(--border)",
                color: !draftMapRegionColor ? "var(--text-primary)" : "inherit",
              }}
            >
              默认
            </button>
          </div>
        </div>
      </InstancePanel>

      <InstancePanel
        title="壁纸设置"
        description="选择仪表盘的背景壁纸，支持自定义 URL 或上传本地图片（自动缩放压缩）。壁纸仅在打开毛玻璃特效时有最佳效果。"
      >
        <div className="flex flex-col gap-6">
          <div className="instance-segmented">
            <button
              type="button"
              data-active={draftWallpaperMode === "none" ? "true" : "false"}
              onClick={() => setDraftWallpaperMode("none")}
            >
              无壁纸
            </button>
            <button
              type="button"
              data-active={draftWallpaperMode === "bing" ? "true" : "false"}
              onClick={() => setDraftWallpaperMode("bing")}
            >
              必应每日
            </button>
            <button
              type="button"
              data-active={draftWallpaperMode === "custom_url" ? "true" : "false"}
              onClick={() => setDraftWallpaperMode("custom_url")}
            >
              自定义 URL
            </button>
            <button
              type="button"
              data-active={draftWallpaperMode === "custom_upload" ? "true" : "false"}
              onClick={() => setDraftWallpaperMode("custom_upload")}
            >
              上传图片
            </button>
          </div>
          
          {draftWallpaperMode === "custom_url" && (
            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-[var(--text-secondary)] font-medium">图片 URL</label>
              <input
                type="text"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-[14px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                placeholder="https://example.com/wallpaper.jpg"
                value={draftWallpaperUrl}
                onChange={(e) => setDraftWallpaperUrl(e.target.value)}
              />
              {draftWallpaperUrl && (
                <div className="mt-2 rounded-xl overflow-hidden border border-[var(--border-subtle)] h-32 bg-black/20 flex items-center justify-center">
                   <img src={draftWallpaperUrl} alt="Wallpaper Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}
            </div>
          )}

          {draftWallpaperMode === "custom_upload" && (
            <div className="flex flex-col gap-2">
              <label className="text-[13px] text-[var(--text-secondary)] font-medium">上传本地图片 (自动压缩)</label>
              <input
                type="file"
                accept="image/*"
                className="w-full text-[13px] text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[13px] file:font-semibold file:bg-[var(--bg-tertiary)] file:text-[var(--text-primary)] hover:file:bg-[var(--bg-card-hover)] cursor-pointer"
                onChange={handleImageUpload}
              />
              {draftWallpaperData && (
                <div className="mt-2 rounded-xl overflow-hidden border border-[var(--border-subtle)] h-32 bg-black/20 flex items-center justify-center relative">
                   <img src={draftWallpaperData} alt="Wallpaper Preview" className="w-full h-full object-cover" />
                   <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">已压缩</div>
                </div>
              )}
            </div>
          )}

          {draftWallpaperMode !== "none" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[13px] text-[var(--text-secondary)] font-medium flex justify-between">
                  <span>壁纸不透明度</span>
                  <span>{draftWallpaperOpacity}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draftWallpaperOpacity}
                  onChange={(e) => setDraftWallpaperOpacity(parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--color-primary)]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[13px] text-[var(--text-secondary)] font-medium flex justify-between">
                  <span>卡片不透明度 (打开壁纸时生效)</span>
                  <span>{draftCardOpacity}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draftCardOpacity}
                  onChange={(e) => setDraftCardOpacity(parseInt(e.target.value, 10))}
                  className="w-full accent-[var(--color-primary)]"
                />
              </div>
            </div>
          )}
        </div>
      </InstancePanel>


      <InstancePanel
        title="主页延迟检测"
        description={
          <>
            为首页延迟卡片指定对应的 Ping 任务与展示节点。每个节点只能归属一个任务；未分配的节点不会显示延迟。
            {" "}
            如果当前还没有可用任务，请先前往
            {" "}
            <a href="/admin/ping" className="theme-manage-inline-link">
              后台 Ping 管理
            </a>
            {" "}
            创建任务，再回来完成绑定。
          </>
        }
        aside={
          <div className="text-[11px] text-[var(--text-tertiary)]">
            {tasksLoading || clientsLoading ? "载入中" : `${sortedTasks.length} 个任务`}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
            <label className="surface-inset flex items-center gap-2 px-3 py-2">
              <Search size={14} className="text-[var(--text-tertiary)]" />
              <input
                value={taskSearch}
                onChange={(event) => setTaskSearch(event.target.value)}
                placeholder="搜索 Ping 任务名称 / ID / 类型 / 目标"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </label>
            <div className="surface-inset flex items-center justify-between gap-3 px-3 py-2 text-[12px] text-[var(--text-secondary)]">
              <span>首页绑定总数</span>
              <strong className="text-[var(--text-primary)]">
                {assignedNodeCount} / {sortedClients.length}
              </strong>
            </div>
          </div>

          {(tasksLoading || clientsLoading) && (
            <div className="flex min-h-[20vh] items-center justify-center">
              <Spinner size={24} />
            </div>
          )}

          {noTasksYet && (
            <div className="theme-manage-empty-state">
              <span>当前还没有可用于首页展示的 Ping 任务。</span>
              <a href="/admin/ping" className="theme-manage-inline-link">
                前往后台 Ping 管理创建任务
              </a>
            </div>
          )}

          {noFilteredTaskMatch && (
            <div className="surface-inset px-4 py-5 text-[13px] text-[var(--text-secondary)]">
              没有匹配的 Ping 任务。
            </div>
          )}

          {!tasksLoading &&
            !clientsLoading &&
            !noTasksYet &&
            filteredTasks.map((task) => {
              const assigned = (draftBindings[String(task.id)] ?? []).filter(uuid => clientsById.has(uuid));
              const isExpanded = expandedTaskId === task.id;
              return (
                <section key={task.id} className="surface-inset px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
                          {task.name || `任务 #${task.id}`}
                        </h3>
                        <span className="rounded-full border border-[var(--hairline)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                          {task.type || "icmp"}
                        </span>
                        <span className="rounded-full border border-[var(--hairline)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                          {task.interval}s
                        </span>
                        <span className="rounded-full border border-[var(--hairline)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-tertiary)]">
                          ID {task.id}
                        </span>
                      </div>
                      <div className="mt-2 text-[12px] text-[var(--text-secondary)]">
                        <span className="font-medium text-[var(--text-primary)]">
                          已绑定 {assigned.length} 个节点
                        </span>
                        <span className="mx-2 text-[var(--text-tertiary)]">·</span>
                        <span title={task.target || ""}>{task.target || "未填写目标"}</span>
                      </div>
                      <p
                        className="mt-2 text-[12px] text-[var(--text-tertiary)]"
                        title={summarizeNodes(assigned, clientsById)}
                      >
                        {summarizeNodes(assigned, clientsById)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {assigned.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setDraftBindings((prev) => {
                              const next = { ...prev };
                              delete next[String(task.id)];
                              return pruneBindings(next);
                            });
                          }}
                          className="theme-manage-button is-compact is-danger"
                        >
                          清空节点
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedTaskId((current) => (current === task.id ? null : task.id));
                          setNodeSearch("");
                        }}
                        className="theme-manage-button is-compact"
                      >
                        {isExpanded ? "收起节点" : "编辑节点"}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 border-t border-[var(--hairline)] pt-4">
                      <label className="surface-inset flex items-center gap-2 px-3 py-2">
                        <Search size={14} className="text-[var(--text-tertiary)]" />
                        <input
                          value={nodeSearch}
                          onChange={(event) => setNodeSearch(event.target.value)}
                          placeholder="搜索节点名称 / UUID / 分组 / 地区"
                          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
                        />
                      </label>

                      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                        {visibleClients.map((client) => {
                          const checked = assigned.includes(client.uuid);
                          const subtitle = [client.group, client.uuid].filter(Boolean).join(" · ");
                          return (
                            <label
                              key={client.uuid}
                              className={clsx(
                                "flex cursor-pointer items-start gap-3 rounded-[12px] border px-3 py-3 transition-colors",
                                checked
                                  ? "border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--hover-bg)_72%,transparent)]"
                                  : "border-[var(--hairline)] bg-transparent hover:bg-[var(--hover-bg)]",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  const nextChecked = event.target.checked;
                                  setDraftBindings((prev) =>
                                    applyClientAssignment(prev, task.id, client.uuid, nextChecked),
                                  );
                                }}
                                className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent-500)]"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Flag region={client.region} size={14} />
                                  <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                                    {client.name}
                                  </span>
                                </div>
                                <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                                  {subtitle || client.region || "未设置分组"}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
        </div>
      </InstancePanel>
    </div>
  );
}
