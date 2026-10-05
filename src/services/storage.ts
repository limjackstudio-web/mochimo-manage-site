import { initialData } from "../data/initialData";
import type { Category, MochimoData, ScheduleBlock, Task } from "../types";

const STORAGE_KEY = "mochimo.v1";
const categories: readonly Category[] = ["internship", "website", "project360", "personal", "learning", "rest", "free"];
const priorities = ["low", "medium", "high"] as const;
const energies = ["low", "medium", "high"] as const;
const statuses = ["todo", "in-progress", "done"] as const;
const blockKinds = ["task", "commitment", "break", "free-time"] as const;

export function loadData(): MochimoData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return initialData;
    const parsed: unknown = JSON.parse(saved);
    if (isMochimoData(parsed)) return parsed;
    console.warn("Saved Mochimo data is invalid; using the sample data instead.");
    return initialData;
  } catch (error) {
    console.error("Unable to read Mochimo data from local storage.", error);
    return initialData;
  }
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
