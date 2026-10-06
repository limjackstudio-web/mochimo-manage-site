import type { Category, MochimoData, ScheduleBlock, Task } from "../types";

export const categoryLabels: Record<Category, string> = {
  internship: "Internship work",
  website: "Website listings",
  project360: "360° system",
  personal: "Personal project",
  learning: "Game planning",
  rest: "Rest & games",
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

export function createSuggestedSchedule(dayValue: Date, tasks: Task[]): ScheduleBlock[] {
  const day = new Date(dayValue.getFullYear(), dayValue.getMonth(), dayValue.getDate());
  const workday = day.getDay() > 0 && day.getDay() < 6;
  const workTasks = sortForPlanning(tasks.filter((task) => task.area === "work" && task.status !== "done"));
  const personalTasks = sortForPlanning(tasks.filter((task) => task.area === "personal" && task.status !== "done"));
  const blocks: ScheduleBlock[] = [];
  const add = (id: string, title: string, category: Category, startHour: number, startMinute: number, endHour: number, endMinute: number, kind: ScheduleBlock["kind"], task?: Task) => {
    const start = new Date(day);
    start.setHours(startHour, startMinute, 0, 0);
    const end = new Date(day);
    end.setHours(endHour, endMinute, 0, 0);
    blocks.push({ id: `${day.toISOString().slice(0, 10)}-${id}`, taskId: task?.id, title, category: task?.category ?? category, start: start.toISOString(), end: end.toISOString(), kind });
  };

  if (workday) {
    const personalTask = personalTasks.length ? personalTasks[day.getDate() % Math.min(personalTasks.length, 2)] : undefined;
    add("wake", "Wake up and get ready", "personal", 7, 0, 7, 30, "commitment");
    add("commute-out", "Leave for work / commute", "internship", 7, 30, 8, 0, "commitment");
    const slots: Array<[number, number, number, number]> = [[8, 0, 10, 0], [10, 15, 12, 15], [14, 0, 16, 0]];
    slots.forEach(([startHour, startMinute, endHour, endMinute], index) => {
      const task = workTasks[index];
      add(`focus-${index + 1}`, task?.title ?? "Regular internship work and buffer", task?.category ?? "internship", startHour, startMinute, endHour, endMinute, task ? "task" : "commitment", task);
      if (index === 0) add("morning-break", "Short screen break", "rest", 10, 0, 10, 15, "break");
    });
    add("work-wrap-morning", "Catch-up and regular work", "internship", 12, 15, 13, 0, "commitment");
    add("lunch", "Lunch break", "rest", 13, 0, 14, 0, "break");
    add("work-wrap-afternoon", "Regular work and end-of-day wrap-up", "internship", 16, 0, 17, 30, "commitment");
    add("evening-reset", "Commute, dinner and reset (flexible)", "rest", 17, 30, 19, 30, "free-time");
    if (personalTask) add("personal-focus", personalTask.title, personalTask.category, 19, 30, 20, 30, "task", personalTask);
    add("evening-rest", "Play games or leave the evening open", "rest", 20, 30, 22, 0, "free-time");
  } else {
    const personalTask = personalTasks[0];
    add("slow-morning", "Slow morning / breakfast", "rest", 9, 0, 10, 0, "free-time");
    if (personalTask) add("personal-focus", personalTask.title, personalTask.category, 10, 0, 11, 30, "task", personalTask);
    add("break", "Step away and rest", "rest", 11, 30, 12, 0, "break");
    add("lunch", "Lunch", "rest", 12, 30, 13, 30, "break");
    add("open-afternoon", "Open time, play or recharge", "free", 13, 30, 18, 0, "free-time");
    add("game-time", "Games and downtime", "rest", 19, 30, 21, 0, "free-time");
  }
  return blocks;
}

function sortForPlanning(tasks: Task[]): Task[] {
  const priority = { high: 0, medium: 1, low: 2 };
  const status = { "in-progress": 0, todo: 1, done: 2 };
  return [...tasks].sort((a, b) => status[a.status] - status[b.status] || priority[a.priority] - priority[b.priority] || new Date(a.deadline ?? "2999-01-01").getTime() - new Date(b.deadline ?? "2999-01-01").getTime());
}

export function getBudget(data: MochimoData) {
  const totals = {} as Record<Category, number>;
  for (const category of Object.keys(categoryLabels) as Category[]) totals[category] = 0;
  for (const block of data.schedule) {
    if (block.kind === "task" && isToday(block.start)) totals[block.category] += minutesBetween(block.start, block.end);
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

  const hour = new Date().getHours();
  const workTime = hour >= 8 && hour < 17;
  const inWorkArea = remaining.filter((task) => task.area === (workTime ? "work" : "personal"));
  const candidates = inWorkArea.length ? inWorkArea : remaining;
  const urgent = candidates
    .filter((task) => task.deadline)
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];
  const focus = [...candidates].sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 };
    return priority[a.priority] - priority[b.priority] || a.estimatedMinutes - b.estimatedMinutes;
  })[0];
  const recommended = urgent && new Date(urgent.deadline!).getTime() < Date.now() + 36 * 3600000 ? urgent : focus;
  if (availableMinutes < recommended.estimatedMinutes) {
    return `A good next step is ${recommended.title}. It’s a larger task, so use one focused block and keep your 1:00–2:00 lunch break protected.`;
  }
  return `${workTime ? "During your workday" : "For your personal time"}, start with ${recommended.title}. Set aside about ${formatDuration(Math.min(recommended.estimatedMinutes, 120))}, then check in before adding another task.`;
}

export function getAssistantResponse(message: string, data: MochimoData): string {
  const lower = message.toLowerCase();
  const available = getRequestedMinutes(lower) ?? data.availableMinutes;
  const openTasks = data.tasks.filter((task) => task.status !== "done");
  if (lower.includes("too many") || lower.includes("overwhelm")) {
    const priorityTasks = openTasks.filter((task) => task.priority === "high").sort((a, b) => {
      const areaRank = (task: Task) => task.area === "work" && new Date().getHours() < 18 ? 0 : 1;
      return areaRank(a) - areaRank(b) || new Date(a.deadline ?? "2999-01-01").getTime() - new Date(b.deadline ?? "2999-01-01").getTime();
    });
    const count = priorityTasks.length;
    return count
      ? `Let’s make the list feel smaller. I’d focus on ${priorityTasks[0].title} first, then choose just one more high-priority task. The rest can wait until we know how much energy you have.`
      : "Let’s make the list feel smaller: choose one task that truly needs attention today, and give yourself permission to leave the rest for later.";
  }
  if (lower.includes("workday") || lower.includes("work day") || lower.includes("weekday") || lower.includes("split my time")) {
    const workTasks = sortForPlanning(openTasks.filter((task) => task.area === "work"));
    const label = (index: number) => workTasks[index]?.title ?? "regular work and a buffer";
    return `A gentle weekday draft: 7:00–7:30 get ready, 7:30 leave, then 8:00–10:00 ${label(0)}; 10:15–12:15 ${label(1)}; keep 1:00–2:00 for lunch; 2:00–4:00 ${label(2)}; leave 4:00–5:30 for regular work and wrap-up. After 5:30, protect time for getting home, dinner and rest. Add one 60-minute personal block at 7:30 only if you have energy. I’ve put a saveable outline in Planner.`;
  }
  if (lower.includes("balance")) {
    return "Keep the 8:00–5:30 workday for internship tasks and protect the 1:00–2:00 lunch break. After 5:30, leave time for the trip home, dinner and a reset. On a few evenings, choose one short block for the game plan or internship report; leave other evenings open for games and rest. You don’t need to push every personal project forward each night.";
  }
  if (lower.includes("tomorrow")) {
    const priority = { high: 0, medium: 1, low: 2 };
    const nextTask = [...openTasks.filter((task) => task.area === "work")].sort((a, b) => priority[a.priority] - priority[b.priority] || new Date(a.deadline ?? "2999-01-01").getTime() - new Date(b.deadline ?? "2999-01-01").getTime())[0];
    return `Tomorrow, protect 8:00–1:00 for focused work, keep 1:00–2:00 for lunch, and leave a buffer before 5:30. A good work block is${nextTask ? ` ${nextTask.title}` : " your next unfinished work task"}. Save game planning or report writing for a short evening block if you still have energy. Open Planner to see and save the day outline.`;
  }
  const personalRequest = lower.includes("personal") || lower.includes("game") || lower.includes("evening") || lower.includes("after work");
  const areaTasks = openTasks.filter((task) => task.area === (personalRequest ? "personal" : "work"));
  const candidates = areaTasks.length ? areaTasks : openTasks;
  const candidate = candidates
    .filter((task) => task.estimatedMinutes <= available)
    .sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.priority] - priority[b.priority] || new Date(a.deadline ?? "2999-01-01").getTime() - new Date(b.deadline ?? "2999-01-01").getTime();
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
