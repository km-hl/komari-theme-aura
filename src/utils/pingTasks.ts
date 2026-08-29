export type HomepagePingTaskBindings = Record<string, string[]>;
export const MAX_HOMEPAGE_PING_TASKS = 3;

export function normalizeHomepagePingTaskBindings(
  value: unknown,
): HomepagePingTaskBindings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized: HomepagePingTaskBindings = {};
  for (const [taskId, clients] of Object.entries(value)) {
    const numericTaskId = Number(taskId);
    if (!Number.isInteger(numericTaskId) || numericTaskId <= 0) {
      continue;
    }

    if (!Array.isArray(clients)) {
      continue;
    }

    const uniqueClients = Array.from(
      new Set(
        clients
          .map((client) => (typeof client === "string" ? client.trim() : ""))
          .filter(Boolean),
      ),
    );
    if (uniqueClients.length === 0) {
      continue;
    }

    normalized[String(numericTaskId)] = uniqueClients;
  }

  return normalized;
}

export function invertHomepagePingTaskBindings(
  bindings: HomepagePingTaskBindings,
): Map<string, number> {
  const selectedTaskByClient = new Map<string, number>();
  const entries = Object.entries(bindings).sort(
    ([left], [right]) => Number(left) - Number(right),
  );

  for (const [taskId, clients] of entries) {
    const numericTaskId = Number(taskId);
    if (!Number.isInteger(numericTaskId) || numericTaskId <= 0) {
      continue;
    }
    for (const client of clients) {
      if (!selectedTaskByClient.has(client)) {
        selectedTaskByClient.set(client, numericTaskId);
      }
    }
  }

  return selectedTaskByClient;
}

export function countHomepagePingAssignmentsForClient(
  bindings: HomepagePingTaskBindings,
  clientUuid: string,
) {
  let count = 0;
  for (const clients of Object.values(bindings)) {
    if (clients.includes(clientUuid)) count += 1;
  }
  return count;
}

export function getHomepagePingTaskIdsForClient(
  bindings: HomepagePingTaskBindings,
  clientUuid: string,
): number[] {
  return Object.entries(normalizeHomepagePingTaskBindings(bindings))
    .sort(([left], [right]) => Number(left) - Number(right))
    .filter(([, clients]) => clients.includes(clientUuid))
    .map(([taskId]) => Number(taskId))
    .filter((taskId) => Number.isInteger(taskId) && taskId > 0)
    .slice(0, MAX_HOMEPAGE_PING_TASKS);
}

export function normalizeHomepagePingTaskIds(
  value: unknown,
  fallbackBindings?: unknown,
): number[] {
  const selected = new Set<number>();

  if (Array.isArray(value)) {
    for (const item of value) {
      const taskId = typeof item === "number" ? item : Number(item);
      if (Number.isInteger(taskId) && taskId > 0) {
        selected.add(taskId);
      }
      if (selected.size >= MAX_HOMEPAGE_PING_TASKS) break;
    }
  }

  if (selected.size === 0) {
    const bindings = normalizeHomepagePingTaskBindings(fallbackBindings);
    for (const taskId of Object.keys(bindings).sort((left, right) => Number(left) - Number(right))) {
      selected.add(Number(taskId));
      if (selected.size >= MAX_HOMEPAGE_PING_TASKS) break;
    }
  }

  return Array.from(selected).slice(0, MAX_HOMEPAGE_PING_TASKS);
}
