import type { Category, MochimoData, Task } from "../types";

export const categoryLabels: Record<Category, string> = {
  internship: "Internship",
  website: "Website & design",
  project360: "360° project",
  personal: "Personal",
  learning: "Learning",
  rest: "Rest",
  free: "Free time",
};

export const categoryColors: Record<Category, string> = {
  internship: "#7186c8",
  website: "#df9f78",
  project360: "#9380c5",
  personal: "#66a38c",
  learning: "#d0a34f",
  rest: "#84aeb0",
  free: "#c3c8c5",
};

export function minutesBetween(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return `${hours}h ${remainder}m`;
  if (hours) return `${hours}h`;
  return `${remainder}m`;
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function getBudget(data: MochimoData) {
  const totals = {} as Record<Category, number>;
  for (const category of Object.keys(categoryLabels) as Category[]) totals[category] = 0;
  for (const block of data.schedule) {
    if (isToday(block.start)) totals[block.category] += minutesBetween(block.start, block.end);
  }
  const allocatedMinutes = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return {
    totals,
    allocatedMinutes,
    remainingMinutes: data.availableMinutes - allocatedMinutes,
    overScheduled: allocatedMinutes > data.availableMinutes,
  };
}

function isToday(value: string): boolean {
  const candidate = new Date(value);
  const now = new Date();
  return candidate.getFullYear() === now.getFullYear()
    && candidate.getMonth() === now.getMonth()
    && candidate.getDate() === now.getDate();
}

export function getSuggestion(tasks: Task[], availableMinutes: number): string {
  const remaining = tasks.filter((task) => task.status !== "done");
  if (!remaining.length) return "You’ve wrapped up everything on your list. Let yourself enjoy that feeling.";

  const urgent = remaining
    .filter((task) => task.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];
  const focus = [...remaining].sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 };
    return priority[a.priority] - priority[b.priority] || a.estimatedMinutes - b.estimatedMinutes;
  })[0];
  const recommended = urgent && new Date(urgent.deadline!).getTime() < Date.now() + 36 * 3600000 ? urgent : focus;
  if (availableMinutes < recommended.estimatedMinutes) {
    return `You have ${formatDuration(availableMinutes)} available, so ${recommended.title} may need a smaller first step. Keep some room for a break, too.`;
  }
  return `A gentle place to start: ${recommended.title}. It’s about ${formatDuration(recommended.estimatedMinutes)}—then take a short reset before choosing what’s next.`;
}

export function getAssistantResponse(message: string, data: MochimoData): string {
  const lower = message.toLowerCase();
  const available = getRequestedMinutes(lower) ?? data.availableMinutes;
  const openTasks = data.tasks.filter((task) => task.status !== "done");
  if (lower.includes("too many") || lower.includes("overwhelm")) {
    const priorityTasks = openTasks.filter((task) => task.priority === "high");
    const count = priorityTasks.length;
    return count
      ? `Let’s make the list feel smaller. I’d focus on ${priorityTasks[0].title} first, then choose just one more high-priority task. The rest can wait until we know how much energy you have.`
      : "Let’s make the list feel smaller: choose one task that truly needs attention today, and give yourself permission to leave the rest for later.";
  }
  if (lower.includes("tomorrow")) {
    const priority = { high: 0, medium: 1, low: 2 };
    const nextTask = [...openTasks].sort((a, b) => priority[a.priority] - priority[b.priority])[0];
    return `For tomorrow, start with your highest-priority task${nextTask ? `, ${nextTask.title}` : ""}, then leave a little buffer between focused blocks. This is a draft suggestion based on your current task list.`;
  }
  const candidate = openTasks
    .filter((task) => task.estimatedMinutes <= available)
    .sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.priority] - priority[b.priority];
    })[0];
  if (!candidate) {
    return `Your tasks don’t fit comfortably into ${formatDuration(available)}. I’d use that time to make progress on one small next step and protect a little rest time.`;
  }
  return `With ${formatDuration(available)}, I’d start with ${candidate.title} (${formatDuration(candidate.estimatedMinutes)}). Keep ${formatDuration(Math.max(15, available - candidate.estimatedMinutes))} unscheduled as a buffer for breaks or anything that runs long.`;
}

function getRequestedMinutes(message: string): number | undefined {
  const hours = message.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/);
  if (hours) return Math.round(Number(hours[1]) * 60);
  const minutes = message.match(/(\d+)\s*(?:minutes?|mins?)\b/);
  if (minutes) return Number(minutes[1]);
  return undefined;
}
