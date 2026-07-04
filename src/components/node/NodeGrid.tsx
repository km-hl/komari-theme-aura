import { useHomepagePingOverview } from "@/hooks/usePingMini";
import { NodeCard } from "./NodeCard";

interface NodeGridProps {
  uuids: string[];
}

export function NodeGrid({ uuids }: NodeGridProps) {
  useHomepagePingOverview();

  if (uuids.length === 0) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-[var(--text-tertiary)]">
        <span className="text-[15px]">未找到匹配的节点或尚未连接到任何节点</span>
        <span className="text-[12px]">请尝试更改搜索条件或等待后端推送</span>
      </div>
    );
  }

  return (
    <div
      className="grid gap-4 xl:gap-5"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 360px), 1fr))" }}
    >
      {uuids.map((uuid) => (
        <div key={uuid}>
          <NodeCard uuid={uuid} />
        </div>
      ))}
    </div>
  );
}
