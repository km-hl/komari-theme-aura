import { Search, LayoutGrid, List } from "lucide-react";
import { clsx } from "clsx";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeGroup: string;
  setActiveGroup: (group: string) => void;
  groups: string[];
  viewMode: "grid" | "table";
  setViewMode: (mode: "grid" | "table") => void;
}

export function SearchBar({
  searchQuery,
  setSearchQuery,
  activeGroup,
  setActiveGroup,
  groups,
  viewMode,
  setViewMode,
}: SearchBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
      <div className="relative w-full md:w-80 lg:w-96">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={16} className="text-[var(--text-tertiary)]" />
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-highlight)] transition-all"
          placeholder="搜索节点名称、地区、系统..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {groups.map((group) => (
          <button
            key={group}
            onClick={() => setActiveGroup(group)}
            className={clsx(
              "whitespace-nowrap px-4 py-1.5 rounded-full text-[13px] font-medium transition-all duration-200 border",
              activeGroup === group
                ? "bg-[var(--text-primary)] text-[var(--bg-base)] border-[var(--text-primary)] shadow-sm"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
            )}
          >
            {group}
          </button>
        ))}
        </div>

        <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg p-1 hidden md:flex shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={clsx(
              "p-1.5 rounded-md transition-all flex items-center justify-center",
              viewMode === "grid" ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            )}
            title="网格视图"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={clsx(
              "p-1.5 rounded-md transition-all flex items-center justify-center",
              viewMode === "table" ? "bg-[var(--text-primary)] text-[var(--bg-base)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            )}
            title="表格视图"
          >
            <List size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
