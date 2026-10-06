export type Category =
  | "internship"
  | "website"
  | "project360"
  | "personal"
  | "learning"
  | "rest"
  | "free";

export type Priority = "low" | "medium" | "high";
export type Energy = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in-progress" | "done";
export type BlockKind = "task" | "commitment" | "break" | "free-time";
export type TaskArea = "work" | "personal";

export interface Task {
  id: string;
  title: string;
  area: TaskArea;
  category: Category;
  priority: Priority;
  deadline?: string;
  estimatedMinutes: number;
  actualMinutes?: number;
  energyLevel: Energy;
  status: TaskStatus;
  notes: string;
  createdAt: string;
}

export interface ScheduleBlock {
  id: string;
  taskId?: string;
  title: string;
  category: Category;
  start: string;
  end: string;
  kind: BlockKind;
  notes?: string;
}

export interface MochimoData {
  tasks: Task[];
  schedule: ScheduleBlock[];
  availableMinutes: number;
}
