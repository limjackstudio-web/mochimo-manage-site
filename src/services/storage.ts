import { initialData } from "../data/initialData";
import type { Category, MochimoData, ScheduleBlock, Task } from "../types";

const STORAGE_KEY = "mochimo.v2";
const LEGACY_STORAGE_KEY = "mochimo.v1";
const legacySampleTaskIds = new Set(["task-intern-report", "task-website-home", "task-360-viewer", "task-learning", "task-groceries", "task-break"]);
const legacySampleBlockIds = new Set(["block-work", "block-lunch", "block-report", "block-web", "block-rest", "block-personal", "block-free"]);
const categories: readonly Category[] = ["internship", "website", "project360", "personal", "learning", "rest", "free"];
const priorities = ["low", "medium", "high"] as const;
const energies = ["low", "medium", "high"] as const;
const statuses = ["todo", "in-progress", "done"] as const;
const blockKinds = ["task", "commitment", "break", "free-time"] as const;

export function loadData(): MochimoData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
      const parsed: unknown = JSON.parse(saved);
      if (isMochimoData(parsed)) return parsed;
      console.warn("Saved Mochimo data is invalid; checking for an earlier version.");
      } catch (error) {
        console.error("Unable to read saved Mochimo data.", error);
      }
    }
    const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacySaved) return initialData;
    const migrated = migrateLegacyData(JSON.parse(legacySaved));
    saveData(migrated);
    return migrated;
  } catch (error) {
    console.error("Unable to read or migrate Mochimo data.", error);
    return initialData;
  }
}

function migrateLegacyData(value: unknown): MochimoData {
  if (!isRecord(value)) return initialData;
  const oldTasks = Array.isArray(value.tasks) ? value.tasks : [];
  const extraTasks = oldTasks
    .filter((item): item is Record<string, unknown> => isRecord(item) && typeof item.id === "string" && !legacySampleTaskIds.has(item.id))
    .map((item) => {
      const workCategory = item.category === "internship" || item.category === "website" || item.category === "project360";
      return { ...item, area: item.area === "work" || item.area === "personal" ? item.area : workCategory ? "work" : "personal" };
    })
    .filter(isTask);
  const oldSchedule = Array.isArray(value.schedule) ? value.schedule : [];
  const extraBlocks = oldSchedule.filter((item): item is ScheduleBlock => isScheduleBlock(item) && !legacySampleBlockIds.has(item.id));
  const availableMinutes = typeof value.availableMinutes === "number" && Number.isFinite(value.availableMinutes) && value.availableMinutes > 0
    ? value.availableMinutes
    : initialData.availableMinutes;
  return { ...initialData, tasks: [...initialData.tasks, ...extraTasks], schedule: [...initialData.schedule, ...extraBlocks], availableMinutes };
}

function isMochimoData(value: unknown): value is MochimoData {
  return isRecord(value)
    && Array.isArray(value.tasks)
    && value.tasks.every(isTask)
    && Array.isArray(value.schedule)
    && value.schedule.every(isScheduleBlock)
    && typeof value.availableMinutes === "number"
    && Number.isFinite(value.availableMinutes)
    && value.availableMinutes >= 0;
}

function isTask(value: unknown): value is Task {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.title === "string"
    && (value.area === "work" || value.area === "personal")
    && isOneOf(value.category, categories)
    && isOneOf(value.priority, priorities)
    && (value.deadline === undefined || typeof value.deadline === "string")
    && typeof value.estimatedMinutes === "number"
    && Number.isFinite(value.estimatedMinutes)
    && value.estimatedMinutes > 0
    && (value.actualMinutes === undefined || (typeof value.actualMinutes === "number" && Number.isFinite(value.actualMinutes) && value.actualMinutes >= 0))
    && isOneOf(value.energyLevel, energies)
    && isOneOf(value.status, statuses)
    && typeof value.notes === "string"
    && typeof value.createdAt === "string";
}

function isScheduleBlock(value: unknown): value is ScheduleBlock {
  return isRecord(value)
    && typeof value.id === "string"
    && (value.taskId === undefined || typeof value.taskId === "string")
    && typeof value.title === "string"
    && isOneOf(value.category, categories)
    && typeof value.start === "string"
    && typeof value.end === "string"
    && isOneOf(value.kind, blockKinds)
    && (value.notes === undefined || typeof value.notes === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isOneOf<const Values extends readonly string[]>(value: unknown, values: Values): value is Values[number] {
  return typeof value === "string" && values.some((candidate) => candidate === value);
}

export function saveData(data: MochimoData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Unable to save Mochimo data to local storage.", error);
  }
}
