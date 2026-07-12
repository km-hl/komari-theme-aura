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
      <div className="relative w-full md:w-80 lg:w-96 server-card rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-[var(--border-highlight)] transition-all">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <Search size={16} className="text-[var(--text-tertiary)]" />
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2.5 bg-transparent text-[14px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none"
          placeholder="搜索节点名称、地区、系统..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="control-group overflow-x-auto hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {groups.map((group) => (
          <button
            key={group}
            onClick={() => setActiveGroup(group)}
            style={{ padding: '0 20px' }}
            className={clsx(
              "control-button control-toggle inline-flex items-center justify-center whitespace-nowrap h-9 rounded-full text-[12px] font-medium transition-all duration-200 border shrink-0",
              activeGroup === group && "is-active"
            )}
          >
            {group}
          </button>
        ))}
        </div>

        <div className="control-group hidden md:inline-flex shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={clsx(
              "control-button control-toggle grid h-9 w-9 place-items-center",
              viewMode === "grid" && "is-active"
            )}
            title="网格视图"
          >
            <LayoutGrid size={16} strokeWidth={2.2} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={clsx(
              "control-button control-toggle grid h-9 w-9 place-items-center",
              viewMode === "table" && "is-active"
            )}
            title="表格视图"
          >
            <List size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}
