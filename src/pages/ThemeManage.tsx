import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  LayoutTemplate,
  LayoutDashboard,
  Moon,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sun,
  SunMoon,
  Trash2,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { Spinner } from "@/components/ui/Spinner";
import { Flag } from "@/components/ui/Flag";
import { useAuth } from "@/hooks/useAuth";
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
  MAX_HOMEPAGE_PING_TASKS,
  getHomepagePingTaskIdsForClient,
  normalizeHomepagePingTaskBindings,
  normalizeHomepagePingTaskOrderByClient,
  type HomepagePingTaskBindings,
  type HomepagePingTaskOrderByClient,
} from "@/utils/pingTasks";
import { normalizeImageUrl } from "@/utils/imageUrl";

type Appearance = "system" | "light" | "dark";

const APPEARANCE_OPTIONS = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "system", label: "跟随系统", icon: SunMoon },
  { value: "dark", label: "深色", icon: Moon },
] as const;

const THEME_COLOR_OPTIONS = ["#a855f7", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6"];
const DEFAULT_DASHBOARD_TITLE = "仪表盘";

function normalizeAppearance(value: unknown): Appearance {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
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
      .sort(([left], [right]) => left - right),
  );
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

function replaceClientAssignments(
  bindings: HomepagePingTaskBindings,
  clientUuid: string,
  taskIds: number[],
) {
  const next = pruneBindings(bindings);
  for (const [taskId, clients] of Object.entries(next)) {
    const filtered = clients.filter((uuid) => uuid !== clientUuid);
    if (filtered.length > 0) next[taskId] = filtered;
    else delete next[taskId];
  }

  for (const taskId of taskIds.slice(0, MAX_HOMEPAGE_PING_TASKS)) {
    const taskKey = String(taskId);
    next[taskKey] = Array.from(new Set([...(next[taskKey] ?? []), clientUuid]));
  }
  return pruneBindings(next);
}

function serializeOrderByClient(orderByClient: HomepagePingTaskOrderByClient) {
  return JSON.stringify(
    Object.entries(normalizeHomepagePingTaskOrderByClient(orderByClient)).sort(
      ([left], [right]) => left.localeCompare(right),
    ),
  );
}

export function ThemeManage() {
  const {
    data: me,
    isPending: authPending,
    isFetching: authFetching,
    error: authError,
  } = useAuth();
  const { data: config, isLoading: configLoading } = usePublicConfig();
  const [draftAppearance, setDraftAppearance] = useState<Appearance>("system");
  const [draftDashboardTitle, setDraftDashboardTitle] = useState(DEFAULT_DASHBOARD_TITLE);
  const [draftBindings, setDraftBindings] = useState<HomepagePingTaskBindings>({});
  const [draftOrderByClient, setDraftOrderByClient] = useState<HomepagePingTaskOrderByClient>({});
  const [bulkTaskIds, setBulkTaskIds] = useState<number[]>([]);
  const [draftPriceTagColor, setDraftPriceTagColor] = useState<string | undefined>();
  const [draftMapRegionColor, setDraftMapRegionColor] = useState<string | undefined>();
  const [draftWallpaperMode, setDraftWallpaperMode] = useState<"none" | "custom_url" | "custom_upload" | "bing">("none");
  const [draftWallpaperUrl, setDraftWallpaperUrl] = useState("");
  const [draftWallpaperData, setDraftWallpaperData] = useState("");
  const [draftWallpaperOpacity, setDraftWallpaperOpacity] = useState(20);
  const [draftCardOpacity, setDraftCardOpacity] = useState(75);
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
  const sourceDashboardTitle = useMemo(() => {
    const value = config?.theme_settings?.dashboardTitle;
    return typeof value === "string" && value.trim()
      ? value.trim().slice(0, 24)
      : DEFAULT_DASHBOARD_TITLE;
  }, [config?.theme_settings?.dashboardTitle]);
  const sourceOrderByClient = useMemo(
    () => normalizeHomepagePingTaskOrderByClient(config?.theme_settings?.homepagePingOrderByClient),
    [config?.theme_settings?.homepagePingOrderByClient],
  );

  useEffect(() => {
    if (!config) return;
    setDraftAppearance(sourceAppearance);
    setDraftDashboardTitle(sourceDashboardTitle);
    setDraftPriceTagColor(sourcePriceTagColor);
    setDraftMapRegionColor(sourceMapRegionColor);
    setDraftBindings(sourceBindings);
    setDraftOrderByClient(sourceOrderByClient);
    setDraftWallpaperMode(sourceWallpaperMode);
    setDraftWallpaperUrl(sourceWallpaperUrl);
    setDraftWallpaperData(sourceWallpaperData);
    setDraftWallpaperOpacity(sourceWallpaperOpacity);
    setDraftCardOpacity(sourceCardOpacity);
  }, [config, sourceAppearance, sourceDashboardTitle, sourcePriceTagColor, sourceMapRegionColor, sourceBindings, sourceOrderByClient, sourceWallpaperMode, sourceWallpaperUrl, sourceWallpaperData, sourceWallpaperOpacity, sourceCardOpacity]);

  const sortedTasks = useMemo(() => sortTasks(pingTasks ?? []), [pingTasks]);
  const sortedClients = useMemo(() => sortClients(adminClients ?? []), [adminClients]);
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

  const normalizedDraftWallpaperUrl = useMemo(
    () => normalizeImageUrl(draftWallpaperUrl),
    [draftWallpaperUrl],
  );
  const draftBindingsSerialized = useMemo(
    () => serializeBindings(draftBindings),
    [draftBindings],
  );
  const sourceBindingsSerialized = useMemo(
    () => serializeBindings(sourceBindings),
    [sourceBindings],
  );
  const draftOrderSerialized = useMemo(
    () => serializeOrderByClient(draftOrderByClient),
    [draftOrderByClient],
  );
  const sourceOrderSerialized = useMemo(
    () => serializeOrderByClient(sourceOrderByClient),
    [sourceOrderByClient],
  );
  const isDirty =
    draftAppearance !== sourceAppearance ||
    draftDashboardTitle !== sourceDashboardTitle ||
    draftPriceTagColor !== sourcePriceTagColor ||
    draftMapRegionColor !== sourceMapRegionColor ||
    draftWallpaperMode !== sourceWallpaperMode ||
    draftWallpaperUrl !== sourceWallpaperUrl ||
    draftWallpaperData !== sourceWallpaperData ||
    draftWallpaperOpacity !== sourceWallpaperOpacity ||
    draftCardOpacity !== sourceCardOpacity ||
    draftBindingsSerialized !== sourceBindingsSerialized ||
    draftOrderSerialized !== sourceOrderSerialized;

  const assignedNodeCount = useMemo(
    () => sortedClients.filter((client) =>
      getHomepagePingTaskIdsForClient(draftBindings, client.uuid, draftOrderByClient).length > 0,
    ).length,
    [draftBindings, draftOrderByClient, sortedClients],
  );
  const totalAssignmentCount = useMemo(
    () => sortedClients.reduce(
      (total, client) => total + getHomepagePingTaskIdsForClient(
        draftBindings,
        client.uuid,
        draftOrderByClient,
      ).length,
      0,
    ),
    [draftBindings, draftOrderByClient, sortedClients],
  );

  const applyAssignmentsToClients = (clientUuids: string[], taskIds: number[]) => {
    const selectedTaskIds = Array.from(new Set(taskIds))
      .filter((taskId) => sortedTasks.some((task) => task.id === taskId))
      .slice(0, MAX_HOMEPAGE_PING_TASKS);
    setDraftBindings((current) =>
      clientUuids.reduce(
        (next, clientUuid) => replaceClientAssignments(next, clientUuid, selectedTaskIds),
        current,
      ),
    );
    setDraftOrderByClient((current) => {
      const next = { ...current };
      for (const clientUuid of clientUuids) {
        if (selectedTaskIds.length > 0) next[clientUuid] = selectedTaskIds;
        else delete next[clientUuid];
      }
      return normalizeHomepagePingTaskOrderByClient(next);
    });
  };

  const updateClientTasks = (clientUuid: string, taskIds: number[]) => {
    applyAssignmentsToClients([clientUuid], taskIds);
  };

  const addTaskToAllClients = (taskId: number) => {
    let nextBindings = draftBindings;
    const nextOrder = { ...draftOrderByClient };
    for (const client of sortedClients) {
      const currentTaskIds = getHomepagePingTaskIdsForClient(
        nextBindings,
        client.uuid,
        nextOrder,
      );
      if (currentTaskIds.includes(taskId) || currentTaskIds.length >= MAX_HOMEPAGE_PING_TASKS) continue;
      const taskIds = [...currentTaskIds, taskId];
      nextBindings = replaceClientAssignments(nextBindings, client.uuid, taskIds);
      nextOrder[client.uuid] = taskIds;
    }
    setDraftBindings(nextBindings);
    setDraftOrderByClient(normalizeHomepagePingTaskOrderByClient(nextOrder));
  };

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
      delete (baseSettings as any).homepagePingTaskIds;
      const nextSettings = {
        ...baseSettings,
        defaultAppearance: draftAppearance,
        dashboardTitle: draftDashboardTitle.trim().slice(0, 24) || DEFAULT_DASHBOARD_TITLE,
        priceTagColor: draftPriceTagColor,
        mapRegionColor: draftMapRegionColor,
        wallpaperMode: draftWallpaperMode,
        wallpaperUrl: normalizedDraftWallpaperUrl,
        wallpaperData: draftWallpaperData,
        wallpaperOpacity: draftWallpaperOpacity,
        cardOpacity: draftCardOpacity,
        homepagePingBindings: pruneBindings(draftBindings),
        homepagePingOrderByClient: normalizeHomepagePingTaskOrderByClient(draftOrderByClient),
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
    setDraftDashboardTitle(sourceDashboardTitle);
    setDraftPriceTagColor(sourcePriceTagColor);
    setDraftMapRegionColor(sourceMapRegionColor);
    setDraftWallpaperMode(sourceWallpaperMode);
    setDraftWallpaperUrl(sourceWallpaperUrl);
    setDraftWallpaperData(sourceWallpaperData);
    setDraftWallpaperOpacity(sourceWallpaperOpacity);
    setDraftCardOpacity(sourceCardOpacity);
    setDraftBindings(sourceBindings);
    setDraftOrderByClient(sourceOrderByClient);
    setBulkTaskIds([]);
    setMessage(null);
    setError(null);
  };

  if (authPending || (!me && authFetching) || configLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  if (accessRevoked) {
    return <Navigate to="/" replace />;
  }

  if (authError || !me?.logged_in) {
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
        <Link to="/" className="instance-page-back">
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
            <div>已配置节点 {assignedNodeCount} / {sortedClients.length}</div>
            <div>{totalAssignmentCount} 个 Ping 任务绑定</div>
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
             {THEME_COLOR_OPTIONS.map(color => (
               <button
                 key={color}
                 type="button"
                 onClick={() => setDraftPriceTagColor(color)}
                 className={clsx(
                   "w-6 h-6 rounded-full border-2 transition-transform",
                   draftPriceTagColor === color ? "border-[var(--text-primary)] scale-110" : "border-transparent hover:scale-110"
                 )}
                 style={{ background: color }}
                 title={color}
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
                 className="theme-manage-reset-chip ml-1"
               >
                 恢复默认
               </button>
             )}
          </div>
        </div>
      </InstancePanel>

      <InstancePanel
        title="地图点亮颜色"
        description="自定义首页地球仪上在线节点的点亮颜色。"
        aside={
          <div className="w-5 h-5 rounded-md" style={{ background: draftMapRegionColor || "var(--status-info)" }} />
        }
      >
        <div className="surface-inset px-4 py-4 flex items-center justify-between">
          <div className="text-[13px] text-[var(--text-primary)]">地图点亮颜色</div>
          <div className="flex items-center gap-2">
             {THEME_COLOR_OPTIONS.map(color => (
               <button
                 key={color}
                 type="button"
                 onClick={() => setDraftMapRegionColor(color)}
                 className={clsx(
                   "w-6 h-6 rounded-full border-2 transition-transform",
                   draftMapRegionColor === color ? "border-[var(--text-primary)] scale-110" : "border-transparent hover:scale-110"
                 )}
                 style={{ background: color }}
                 title={color}
               />
             ))}
             <input
               type="color"
               value={draftMapRegionColor || "#3b82f6"}
               onChange={e => setDraftMapRegionColor(e.target.value)}
               className="w-6 h-6 rounded-full cursor-pointer border-0 p-0 overflow-hidden [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-full ml-1"
             />
             {draftMapRegionColor && (
               <button
                 type="button"
                 onClick={() => setDraftMapRegionColor(undefined)}
                 className="theme-manage-reset-chip ml-1"
               >
                 恢复默认
               </button>
             )}
          </div>
        </div>
      </InstancePanel>

      <InstancePanel
        title="仪表盘标题"
        description="自定义首页统计卡片上方的栏目标题，最多 24 个字符。"
        aside={<LayoutDashboard size={16} />}
      >
        <div className="surface-inset flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
          <label htmlFor="dashboard-title" className="shrink-0 text-[13px] font-medium text-[var(--text-primary)]">
            标题文字
          </label>
          <input
            id="dashboard-title"
            type="text"
            maxLength={24}
            value={draftDashboardTitle}
            onChange={(event) => setDraftDashboardTitle(event.target.value)}
            placeholder={DEFAULT_DASHBOARD_TITLE}
            className="theme-manage-text-input"
          />
          <span className="shrink-0 text-[11px] tabular-nums text-[var(--text-tertiary)]">
            {draftDashboardTitle.length} / 24
          </span>
          <button
            type="button"
            onClick={() => setDraftDashboardTitle(DEFAULT_DASHBOARD_TITLE)}
            disabled={draftDashboardTitle === DEFAULT_DASHBOARD_TITLE}
            className="theme-manage-reset-chip shrink-0"
          >
            恢复默认
          </button>
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
                   <img src={normalizedDraftWallpaperUrl} alt="Wallpaper Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
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
            按节点配置首页展示的 Ping 任务；每个节点最多绑定 {MAX_HOMEPAGE_PING_TASKS} 个，并可单独调整显示顺序。
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
            {tasksLoading || clientsLoading
              ? "载入中"
              : `${assignedNodeCount} 个节点 · ${totalAssignmentCount} 个任务绑定`}
          </div>
        }
      >
        <div className="flex flex-col gap-4">
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

          {!tasksLoading &&
            !clientsLoading &&
            !noTasksYet &&
            <>
              <section className="surface-inset px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">批量绑定模板</h3>
                    <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                      按点击顺序选择任务，再一次应用到所有节点；任务卡右侧也可一键追加到全部节点。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={bulkTaskIds.length === 0 || sortedClients.length === 0}
                      onClick={() => applyAssignmentsToClients(sortedClients.map((client) => client.uuid), bulkTaskIds)}
                      className="theme-manage-button is-compact is-primary"
                    >
                      <Users size={13} />
                      应用到全部节点
                    </button>
                    <button
                      type="button"
                      disabled={bulkTaskIds.length === 0 || assignedNodeCount >= sortedClients.length}
                      onClick={() => applyAssignmentsToClients(
                        sortedClients
                          .filter((client) => getHomepagePingTaskIdsForClient(
                            draftBindings,
                            client.uuid,
                            draftOrderByClient,
                          ).length === 0)
                          .map((client) => client.uuid),
                        bulkTaskIds,
                      )}
                      className="theme-manage-button is-compact"
                    >
                      仅应用到未配置节点
                    </button>
                    <button
                      type="button"
                      disabled={totalAssignmentCount === 0}
                      onClick={() => applyAssignmentsToClients(sortedClients.map((client) => client.uuid), [])}
                      className="theme-manage-button is-compact is-danger"
                    >
                      清空全部
                    </button>
                  </div>
                </div>

                {bulkTaskIds.length > 0 && (
                  <div className="homepage-ping-selection mt-4">
                    {bulkTaskIds.map((taskId, index) => {
                      const task = sortedTasks.find((item) => item.id === taskId);
                      return (
                        <div key={taskId} className="homepage-ping-selection-chip">
                          <span className="homepage-ping-selection-index">{index + 1}</span>
                          <span className="homepage-ping-selection-name">{task?.name || `任务 #${taskId}`}</span>
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => setBulkTaskIds((current) => {
                              const next = [...current];
                              [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                              return next;
                            })}
                            className="homepage-ping-order-button"
                            title="前移"
                          ><ArrowUp size={12} /></button>
                          <button
                            type="button"
                            disabled={index === bulkTaskIds.length - 1}
                            onClick={() => setBulkTaskIds((current) => {
                              const next = [...current];
                              [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                              return next;
                            })}
                            className="homepage-ping-order-button"
                            title="后移"
                          ><ArrowDown size={12} /></button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="theme-ping-task-grid mt-4">
                  {sortedTasks.map((task) => {
                    const selectedIndex = bulkTaskIds.indexOf(task.id);
                    const selected = selectedIndex >= 0;
                    return (
                      <div key={task.id} className={clsx("homepage-ping-task-option", selected && "is-selected")}>
                        <button
                          type="button"
                          disabled={!selected && bulkTaskIds.length >= MAX_HOMEPAGE_PING_TASKS}
                          onClick={() => setBulkTaskIds((current) =>
                            current.includes(task.id)
                              ? current.filter((taskId) => taskId !== task.id)
                              : [...current, task.id].slice(0, MAX_HOMEPAGE_PING_TASKS)
                          )}
                          className="theme-ping-task-main"
                        >
                          <span className="min-w-0 text-left">
                            <strong>{task.name || `任务 #${task.id}`}</strong>
                            <small>{task.type || "icmp"} · {task.interval}s · {task.target || "未填写目标"}</small>
                          </span>
                          <span className="homepage-ping-task-state">
                            {selected ? <><Check size={12} /> 第 {selectedIndex + 1} 项</> : "选择"}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addTaskToAllClients(task.id)}
                          className="theme-manage-button is-compact"
                          title="保留现有绑定并追加到所有未达上限的节点"
                        >
                          <Users size={12} /> 全节点
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <label className="surface-inset flex items-center gap-2 px-3 py-2">
                <Search size={14} className="text-[var(--text-tertiary)]" />
                <input
                  value={nodeSearch}
                  onChange={(event) => setNodeSearch(event.target.value)}
                  placeholder="搜索节点名称 / UUID / 分组 / 地区"
                  className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
                />
              </label>

              <div className="grid gap-3 lg:grid-cols-2">
                {visibleClients.map((client) => {
                  const taskIds = getHomepagePingTaskIdsForClient(
                    draftBindings,
                    client.uuid,
                    draftOrderByClient,
                  );
                  const availableTasks = sortedTasks.filter((task) => !taskIds.includes(task.id));
                  return (
                    <section key={client.uuid} className="surface-inset px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Flag region={client.region} size={14} />
                            <h3 className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{client.name}</h3>
                          </div>
                          <p className="mt-1 truncate text-[11px] text-[var(--text-tertiary)]">
                            {[client.group, client.region, client.uuid].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <span className="homepage-ping-task-state">{taskIds.length} / {MAX_HOMEPAGE_PING_TASKS}</span>
                      </div>

                      <div className="homepage-ping-selection mt-3">
                        {taskIds.map((taskId, index) => {
                          const task = sortedTasks.find((item) => item.id === taskId);
                          return (
                            <div key={taskId} className="homepage-ping-selection-chip">
                              <span className="homepage-ping-selection-index">{index + 1}</span>
                              <span className="homepage-ping-selection-name">{task?.name || `任务 #${taskId}`}</span>
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => {
                                  const next = [...taskIds];
                                  [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                                  updateClientTasks(client.uuid, next);
                                }}
                                className="homepage-ping-order-button"
                                title="前移"
                              ><ArrowUp size={12} /></button>
                              <button
                                type="button"
                                disabled={index === taskIds.length - 1}
                                onClick={() => {
                                  const next = [...taskIds];
                                  [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                                  updateClientTasks(client.uuid, next);
                                }}
                                className="homepage-ping-order-button"
                                title="后移"
                              ><ArrowDown size={12} /></button>
                              <button
                                type="button"
                                onClick={() => updateClientTasks(client.uuid, taskIds.filter((id) => id !== taskId))}
                                className="homepage-ping-order-button is-danger"
                                title="移除"
                              ><Trash2 size={12} /></button>
                            </div>
                          );
                        })}
                        {taskIds.length === 0 && (
                          <span className="text-[12px] text-[var(--text-tertiary)]">尚未绑定 Ping 任务</span>
                        )}
                      </div>

                      <label className="theme-ping-add-select mt-3">
                        <Plus size={13} />
                        <select
                          value=""
                          disabled={taskIds.length >= MAX_HOMEPAGE_PING_TASKS || availableTasks.length === 0}
                          onChange={(event) => {
                            const taskId = Number(event.target.value);
                            if (taskId > 0) updateClientTasks(client.uuid, [...taskIds, taskId]);
                          }}
                        >
                          <option value="">{taskIds.length >= MAX_HOMEPAGE_PING_TASKS ? "已达到绑定上限" : "添加 Ping 任务..."}</option>
                          {availableTasks.map((task) => (
                            <option key={task.id} value={task.id}>{task.name || `任务 #${task.id}`}</option>
                          ))}
                        </select>
                      </label>
                    </section>
                  );
                })}
              </div>
            </>}
        </div>
      </InstancePanel>
    </div>
  );
}
