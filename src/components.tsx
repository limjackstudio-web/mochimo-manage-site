import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Coffee,
  Ellipsis,
  Flower2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { categoryColors, categoryLabels, formatDuration, formatTime, getBudget, minutesBetween } from "./services/planner";
import type { Category, MochimoData, Priority, ScheduleBlock, Task } from "./types";

export type View = "Dashboard" | "Tasks" | "Planner" | "Time Budget" | "Mochi AI";

const categories = Object.keys(categoryLabels) as Category[];
const navItems: { label: View; icon: typeof Flower2 }[] = [
  { label: "Dashboard", icon: Flower2 },
  { label: "Tasks", icon: Check },
  { label: "Planner", icon: CalendarDays },
  { label: "Time Budget", icon: Clock3 },
  { label: "Mochi AI", icon: Sparkles },
];

export function Sidebar({ active, onNavigate }: { active: View; onNavigate: (view: View) => void }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={() => onNavigate("Dashboard")} aria-label="Mochimo home">
        <span className="brand-mark"><Flower2 size={21} /></span>
        <span>mochimo<span className="brand-period">.</span></span>
      </button>
      <div className="nav-caption">YOUR SPACE</div>
      <nav className="main-nav" aria-label="Main navigation">
        {navItems.map(({ label, icon: Icon }) => (
          <button key={label} className={`nav-item ${active === label ? "active" : ""}`} onClick={() => onNavigate(label)}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            {label === "Mochi AI" && <span className="nav-new">NEW</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-mochi"><MochiFace size="small" /><div><strong>A little reminder</strong><span>Progress, not perfection.</span></div></div>
        <div className="profile"><div className="avatar">X</div><div><strong>Xin Yee</strong><span>Your personal space</span></div><Ellipsis size={18} /></div>
      </div>
    </aside>
  );
}

export function PageHeading({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

export function MochiFace({ size = "large" }: { size?: "large" | "small" }) {
  return <div className={`mochi-face ${size}`} aria-label="Mochi, your planning buddy"><span className="mochi-ear left" /><span className="mochi-ear right" /><span className="mochi-eye left" /><span className="mochi-eye right" /><span className="mochi-cheek left" /><span className="mochi-cheek right" /><span className="mochi-mouth" /></div>;
}

export function ProgressRing({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return <div className="progress-ring" style={{ background: `conic-gradient(var(--sage) ${safeValue * 3.6}deg, #edf0ea 0deg)` }}><div><strong>{safeValue}%</strong><span>done</span></div></div>;
}

export function BudgetSummary({ data, compact = false }: { data: MochimoData; compact?: boolean }) {
  const budget = getBudget(data);
  const categoriesUsed = categories.filter((category) => budget.totals[category] > 0);
  return (
    <div className={`budget-summary ${compact ? "compact" : ""}`}>
      <div className="budget-numbers">
        <div><span>Available</span><strong>{formatDuration(data.availableMinutes)}</strong></div>
        <div><span>Planned</span><strong>{formatDuration(budget.allocatedMinutes)}</strong></div>
        <div><span>{budget.overScheduled ? "Over by" : "Free"}</span><strong className={budget.overScheduled ? "text-danger" : ""}>{formatDuration(Math.abs(budget.remainingMinutes))}</strong></div>
      </div>
      <div className="budget-bar" role="img" aria-label={`Time budget: ${formatDuration(budget.allocatedMinutes)} planned of ${formatDuration(data.availableMinutes)} available`}>
        {categoriesUsed.map((category) => <span key={category} style={{ width: `${Math.min(100, budget.totals[category] / Math.max(data.availableMinutes, budget.allocatedMinutes, 1) * 100)}%`, backgroundColor: categoryColors[category] }} title={`${categoryLabels[category]}: ${formatDuration(budget.totals[category])}`} />)}
      </div>
      {budget.overScheduled && <div className="warning-note"><span>!</span> Your plan is fuller than your available time. Leave a little breathing room.</div>}
      {!compact && <div className="budget-legend">{categoriesUsed.map((category) => <div key={category}><i style={{ backgroundColor: categoryColors[category] }} /><span>{categoryLabels[category]}</span><strong>{formatDuration(budget.totals[category])}</strong></div>)}</div>}
    </div>
  );
}

export function ScheduleList({ blocks, compact = false, onAdd }: { blocks: ScheduleBlock[]; compact?: boolean; onAdd?: () => void }) {
  const ordered = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  return (
    <div className={`schedule-list ${compact ? "compact" : ""}`}>
      {ordered.length === 0 && <div className="empty-state"><CalendarDays size={24} /><span>Your day has room for a plan.</span></div>}
      {ordered.map((block) => (
        <div className="schedule-row" key={block.id}>
          <div className="schedule-time">{formatTime(block.start)}<span>{formatTime(block.end)}</span></div>
          <div className="schedule-track"><i style={{ backgroundColor: categoryColors[block.category] }} /></div>
          <div className="schedule-content"><div className="schedule-title">{block.title}{block.kind === "break" && <Coffee size={13} />}</div><span>{categoryLabels[block.category]} <b>·</b> {formatDuration(minutesBetween(block.start, block.end))}</span></div>
        </div>
      ))}
      {onAdd && <button className="add-schedule" onClick={onAdd}><Plus size={15} /> Add a time block</button>}
    </div>
  );
}

export function TaskList({ tasks, onToggle, onEdit, onDelete, compact = false }: { tasks: Task[]; onToggle: (task: Task) => void; onEdit: (task: Task) => void; onDelete?: (task: Task) => void; compact?: boolean }) {
  return (
    <div className={`task-list ${compact ? "compact" : ""}`}>
      {tasks.length === 0 && <div className="empty-state"><Check size={24} /><span>Nothing here right now. A lovely place to be.</span></div>}
      {tasks.map((task) => (
        <div className={`task-row ${task.status === "done" ? "completed" : ""}`} key={task.id}>
          <button className={`task-check ${task.status === "done" ? "checked" : ""}`} onClick={() => onToggle(task)} aria-label={task.status === "done" ? `Reopen ${task.title}` : `Complete ${task.title}`}>{task.status === "done" && <Check size={14} />}</button>
          <button className="task-main" onClick={() => onEdit(task)}><strong>{task.title}</strong><span>{categoryLabels[task.category]} <b>·</b> {formatDuration(task.estimatedMinutes)}{task.deadline && <> <b>·</b> Due {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(task.deadline))}</>}</span></button>
          {!compact && <span className={`priority-pill ${task.priority}`}>{task.priority}</span>}
          {onDelete && <button className="icon-button task-delete" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`}><Trash2 size={15} /></button>}
          {!onDelete && <ChevronDown className="task-chevron" size={16} />}
        </div>
      ))}
    </div>
  );
}

export function TaskDialog({ task, onClose, onSave }: { task?: Task; onClose: () => void; onSave: (task: Task) => void }) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [category, setCategory] = useState<Category>(task?.category ?? "website");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "medium");
  const [duration, setDuration] = useState(String(task?.estimatedMinutes ?? 60));
  const [actualDuration, setActualDuration] = useState(task?.actualMinutes === undefined ? "" : String(task.actualMinutes));
  const [energy, setEnergy] = useState<Task["energyLevel"]>(task?.energyLevel ?? "medium");
  const [status, setStatus] = useState<Task["status"]>(task?.status ?? "todo");
  const [deadline, setDeadline] = useState(task?.deadline ? toLocalInput(task.deadline) : "");
  const [notes, setNotes] = useState(task?.notes ?? "");

  function submit(event: FormEvent) {
    event.preventDefault();
    const estimatedMinutes = Number(duration);
    if (!title.trim() || !Number.isFinite(estimatedMinutes) || estimatedMinutes < 1) return;
    const actualMinutes = actualDuration.trim() ? Number(actualDuration) : undefined;
    if (actualMinutes !== undefined && (!Number.isFinite(actualMinutes) || actualMinutes < 0)) return;
    onSave({
      id: task?.id ?? crypto.randomUUID(), title: title.trim(), category, priority,
      estimatedMinutes, energyLevel: energy, deadline: deadline ? new Date(deadline).toISOString() : undefined,
      notes: notes.trim(), status, actualMinutes,
      createdAt: task?.createdAt ?? new Date().toISOString(),
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="task-dialog" onSubmit={submit}>
        <div className="dialog-heading"><div><span className="eyebrow">{task ? "MAKE A CHANGE" : "ONE THING AT A TIME"}</span><h2>{task ? "Edit task" : "Add a task"}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
        <label className="field full">Task name<input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What would you like to work on?" /></label>
        <div className="field-grid">
          <label className="field">Category<select value={category} onChange={(e) => setCategory(e.target.value as Category)}>{categories.filter((item) => item !== "free").map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}</select></label>
          <label className="field">Priority<select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <label className="field">Estimated minutes<input type="number" min="1" max="1440" required value={duration} onChange={(e) => setDuration(e.target.value)} /></label>
          <label className="field">Energy level<select value={energy} onChange={(e) => setEnergy(e.target.value as Task["energyLevel"])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
          <label className="field">Status<select value={status} onChange={(e) => setStatus(e.target.value as Task["status"])}><option value="todo">To do</option><option value="in-progress">In progress</option><option value="done">Completed</option></select></label>
          <label className="field full">Actual minutes (optional)<input type="number" min="0" max="1440" value={actualDuration} onChange={(e) => setActualDuration(e.target.value)} placeholder="Add this after you work on it" /></label>
          <label className="field full">Deadline<input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
          <label className="field full">Notes<textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything helpful to remember?" /></label>
        </div>
        <div className="dialog-actions"><button className="button quiet" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit">{task ? "Save changes" : "Add task"} <ArrowRight size={16} /></button></div>
      </form>
    </div>
  );
}

export function ScheduleDialog({ onClose, onSave }: { onClose: () => void; onSave: (block: Omit<ScheduleBlock, "id">) => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("website");
  const [start, setStart] = useState(defaultTime(18));
  const [end, setEnd] = useState(defaultTime(19));
  const [kind, setKind] = useState<ScheduleBlock["kind"]>("task");
  function submit(event: FormEvent) {
    event.preventDefault();
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (!title.trim() || endDate <= startDate) return;
    onSave({ title: title.trim(), category, start: startDate.toISOString(), end: endDate.toISOString(), kind });
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="task-dialog" onSubmit={submit}>
    <div className="dialog-heading"><div><span className="eyebrow">MAKE SPACE FOR IT</span><h2>Add a time block</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
    <label className="field full">What’s planned?<input autoFocus required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A focused hour, a break, a commitment…" /></label>
    <div className="field-grid">
      <label className="field">Category<select value={category} onChange={(e) => setCategory(e.target.value as Category)}>{categories.map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}</select></label>
      <label className="field">Kind<select value={kind} onChange={(e) => setKind(e.target.value as ScheduleBlock["kind"])}><option value="task">Task</option><option value="commitment">Commitment</option><option value="break">Break</option><option value="free-time">Free time</option></select></label>
      <label className="field">Starts<input type="datetime-local" required value={start} onChange={(e) => setStart(e.target.value)} /></label>
      <label className="field">Ends<input type="datetime-local" required value={end} onChange={(e) => setEnd(e.target.value)} /></label>
    </div>
    <div className="dialog-actions"><button className="button quiet" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Add time block <ArrowRight size={16} /></button></div>
  </form></div>;
}

function toLocalInput(value: string) {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
function defaultTime(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return toLocalInput(date.toISOString());
}
