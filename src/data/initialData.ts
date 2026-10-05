import type { MochimoData } from "../types";

const today = new Date();
const dateAt = (hour: number, minute = 0) => {
  const value = new Date(today);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
};
const dueAt = (daysAhead: number, hour = 18) => {
  const value = new Date(today);
  value.setDate(value.getDate() + daysAhead);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
};

export const initialData: MochimoData = {
  availableMinutes: 720,
  tasks: [
    {
      id: "task-intern-report",
      title: "Review weekly internship report",
      category: "internship",
      priority: "high",
      deadline: dueAt(0, 17),
      estimatedMinutes: 60,
      energyLevel: "medium",
      status: "in-progress",
      notes: "Check the latest feedback before sending it through.",
      createdAt: dateAt(8),
    },
    {
      id: "task-website-home",
      title: "Polish portfolio homepage design",
      category: "website",
      priority: "high",
      deadline: dueAt(1),
      estimatedMinutes: 90,
      energyLevel: "high",
      status: "todo",
      notes: "Focus on the hero section and mobile spacing.",
      createdAt: dateAt(9),
    },
    {
      id: "task-360-viewer",
      title: "Build the 360° product viewer",
      category: "project360",
      priority: "medium",
      deadline: dueAt(4),
      estimatedMinutes: 120,
      energyLevel: "high",
      status: "todo",
      notes: "Start with the image drag interaction.",
      createdAt: dateAt(9, 30),
    },
    {
      id: "task-learning",
      title: "Explore animation techniques",
      category: "learning",
      priority: "low",
      estimatedMinutes: 45,
      energyLevel: "medium",
      status: "todo",
      notes: "One small tutorial is plenty for today.",
      createdAt: dateAt(10),
    },
    {
      id: "task-groceries",
      title: "Pick up a few groceries",
      category: "personal",
      priority: "medium",
      deadline: dueAt(0, 19),
      estimatedMinutes: 40,
      energyLevel: "low",
      status: "todo",
      notes: "",
      createdAt: dateAt(10, 30),
    },
    {
      id: "task-break",
      title: "Take a proper screen break",
      category: "rest",
      priority: "medium",
      estimatedMinutes: 30,
      energyLevel: "low",
      status: "todo",
      notes: "Step away from the desk for a bit.",
      createdAt: dateAt(11),
    },
  ],
  schedule: [
    {
      id: "block-work",
      title: "Internship",
      category: "internship",
      start: dateAt(9),
      end: dateAt(12, 30),
      kind: "commitment",
    },
    {
      id: "block-lunch",
      title: "Lunch & reset",
      category: "rest",
      start: dateAt(12, 30),
      end: dateAt(13, 30),
      kind: "break",
    },
    {
      id: "block-report",
      taskId: "task-intern-report",
      title: "Review weekly report",
      category: "internship",
      start: dateAt(14),
      end: dateAt(15),
      kind: "task",
    },
    {
      id: "block-web",
      taskId: "task-website-home",
      title: "Portfolio homepage",
      category: "website",
      start: dateAt(15, 30),
      end: dateAt(17),
      kind: "task",
    },
    {
      id: "block-rest",
      title: "A little breathing room",
      category: "rest",
      start: dateAt(17),
      end: dateAt(17, 30),
      kind: "break",
    },
    {
      id: "block-personal",
      title: "Groceries & dinner",
      category: "personal",
      start: dateAt(18),
      end: dateAt(19),
      kind: "commitment",
    },
    {
      id: "block-free",
      title: "Unplanned evening",
      category: "free",
      start: dateAt(19),
      end: dateAt(21),
      kind: "free-time",
    },
  ],
};
