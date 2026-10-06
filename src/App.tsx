import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  Clock3,
  Coffee,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  BudgetSummary,
  MochiFace,
  PageHeading,
  ProgressRing,
  ScheduleDialog,
  ScheduleList,
  Sidebar,
  TaskDialog,
  TaskList,
  type View,
} from "./components";
import {
  categoryColors,
  categoryLabels,
  formatDuration,
  formatTime,
  getAssistantResponse,
  getBudget,
  createSuggestedSchedule,
  getSuggestion,
  minutesBetween,
} from "./services/planner";
import { loadData, saveData } from "./services/storage";
import type { Category, MochimoData, ScheduleBlock, Task, TaskArea } from "./types";

type ChatMessage = { role: "mochi" | "you"; text: string };

export default function App() {
  const [data, setData] = useState<MochimoData>(loadData);
  const [activeView, setActiveView] = useState<View>("Whiteboard");
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>();
  const [taskDefaultArea, setTaskDefaultArea] = useState<TaskArea>("work");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDefaultDate, setScheduleDefaultDate] = useState(new Date());

  useEffect(() => saveData(data), [data]);

  const todayTasks = data.tasks.filter((task) => task.status !== "done");
  const doneToday = data.tasks.filter((task) => task.status === "done").length;
  const progress = data.tasks.length ? Math.round((doneToday / data.tasks.length) * 100) : 0;
  const todayBlocks = useMemo(
    () => data.schedule.filter((block) => sameDay(block.start, new Date())),
    [data.schedule],
  );

  function saveTask(task: Task) {
    setData((current) => {
      const exists = current.tasks.some((item) => item.id === task.id);
      return { ...current, tasks: exists ? current.tasks.map((item) => item.id === task.id ? task : item) : [task, ...current.tasks] };
    });
    setTaskDialogOpen(false);
    setTaskToEdit(undefined);
  }

  function advanceTask(task: Task) {
    const nextStatus: Task["status"] = task.status === "todo" ? "in-progress" : task.status === "in-progress" ? "done" : "todo";
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === task.id
        ? { ...item, status: nextStatus, actualMinutes: nextStatus === "done" ? (item.actualMinutes ?? item.estimatedMinutes) : item.actualMinutes }
        : item),
    }));
  }

  function toggleTask(task: Task) {
    setData((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === task.id
        ? { ...item, status: item.status === "done" ? "todo" : "done", actualMinutes: item.status === "done" ? undefined : item.estimatedMinutes }
        : item),
    }));
  }

  function deleteTask(task: Task) {
    if (!window.confirm(`Delete “${task.title}”?`)) return;
    setData((current) => ({
      ...current,
      tasks: current.tasks.filter((item) => item.id !== task.id),
      schedule: current.schedule.filter((block) => block.taskId !== task.id),
    }));
  }

  function saveSchedule(block: Omit<ScheduleBlock, "id">) {
    setData((current) => ({ ...current, schedule: [...current.schedule, { ...block, id: crypto.randomUUID() }] }));
    setScheduleDialogOpen(false);
  }

  function openSchedule(date = new Date()) {
    setScheduleDefaultDate(date);
    setScheduleDialogOpen(true);
  }

  function saveSuggestedPlan(date: Date, blocks: ScheduleBlock[]) {
    setData((current) => {
      if (current.schedule.some((block) => sameDay(block.start, date))) return current;
      return { ...current, schedule: [...current.schedule, ...blocks] };
    });
  }

  function openTask(task?: Task, area: TaskArea = "work") {
    setTaskToEdit(task);
    setTaskDefaultArea(area);
    setTaskDialogOpen(true);
  }

  return (
    <div className="app-shell">
      <Sidebar active={activeView} onNavigate={setActiveView} />
      <main className="main-area">
        <div className="mobile-brand"><MochiFace size="small" /><span>mochimo<span className="brand-period">.</span></span><span className="mobile-day">{shortDate()}</span></div>
        <div className="mobile-nav">
          {(["Whiteboard", "Dashboard", "Tasks", "Planner", "Time Budget", "Mochi AI"] as View[]).map((view) => (
            <button key={view} className={activeView === view ? "active" : ""} onClick={() => setActiveView(view)}>{view === "Time Budget" ? "Budget" : view === "Mochi AI" ? "Mochi" : view}</button>
          ))}
        </div>
        <div className="content-wrap">
          {activeView === "Whiteboard" && <WhiteboardPage data={data} blocks={todayBlocks} onNavigate={setActiveView} onAddTask={(area) => openTask(undefined, area)} onEdit={openTask} onAdvance={advanceTask} onAddBlock={() => openSchedule()} />}
          {activeView === "Dashboard" && <Dashboard data={data} blocks={todayBlocks} progress={progress} openTasks={todayTasks} onNavigate={setActiveView} onEdit={openTask} onToggle={toggleTask} onAddBlock={() => openSchedule()} />}
          {activeView === "Tasks" && <TasksPage data={data} onAdd={() => openTask()} onEdit={openTask} onToggle={toggleTask} onDelete={deleteTask} />}
          {activeView === "Planner" && <PlannerPage data={data} onAdd={openSchedule} onSavePlan={saveSuggestedPlan} />}
          {activeView === "Time Budget" && <BudgetPage data={data} onChangeAvailable={(minutes) => setData((current) => ({ ...current, availableMinutes: minutes }))} />}
          {activeView === "Mochi AI" && <AssistantPage data={data} />}
        </div>
        <footer className="footer-note"><span>Made for your real life, not an ideal one.</span><span>✳ Mochimo prototype · your data stays in this browser</span></footer>
      </main>
      {taskDialogOpen && <TaskDialog task={taskToEdit} defaultArea={taskDefaultArea} onClose={() => { setTaskDialogOpen(false); setTaskToEdit(undefined); }} onSave={saveTask} />}
      {scheduleDialogOpen && <ScheduleDialog defaultDate={scheduleDefaultDate} onClose={() => setScheduleDialogOpen(false)} onSave={saveSchedule} />}
    </div>
  );
}

function WhiteboardPage({ data, blocks, onNavigate, onAddTask, onEdit, onAdvance, onAddBlock }: {
  data: MochimoData; blocks: ScheduleBlock[]; onNavigate: (view: View) => void; onAddTask: (area: TaskArea) => void;
  onEdit: (task?: Task) => void; onAdvance: (task: Task) => void; onAddBlock: () => void;
}) {
  const workTasks = data.tasks.filter((task) => task.area === "work");
  const personalTasks = data.tasks.filter((task) => task.area === "personal");
  const target = new Date(2026, 9, 30, 17, 0, 0, 0);
  const internshipEnd = new Date(2026, 10, 2, 17, 0, 0, 0);
  const remainingWorkdays = countWeekdays(new Date(), target);
  const workDone = workTasks.filter((task) => task.status === "done").length;
  const personalDone = personalTasks.filter((task) => task.status === "done").length;
  const focusTask = [...data.tasks.filter((task) => task.status !== "done")].sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 };
    return priority[a.priority] - priority[b.priority] || new Date(a.deadline ?? "2999-01-01").getTime() - new Date(b.deadline ?? "2999-01-01").getTime();
  })[0];
  return <>
    <PageHeading eyebrow="YOUR WHITEBOARD" title="A clear list for real life." subtitle="Keep internship goals, personal projects, and time to rest in one calm place." action={<button className="button primary desktop-add" onClick={() => onAddTask("work")}><Plus size={17} /> Add a task</button>} />
    <section className="card whiteboard-deadline">
      <div className="deadline-copy"><span className="eyebrow">YOUR FINISH LINE</span><h2>Key goals by Friday, October 30</h2><p>Wrap up the work plan before your internship ends on Monday, November 2. The game plan and first art milestone are personal targets for the same window.</p></div>
      <div className="deadline-metrics"><div><strong>{remainingWorkdays}</strong><span>weekdays in this window</span></div><div><strong>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(internshipEnd)}</strong><span>internship ends</span></div></div>
    </section>
    <div className="whiteboard-summary">
      <div className="card whiteboard-summary-card"><span className="summary-icon work-icon"><Briefcase size={17} /></span><div><strong>{workTasks.filter((task) => task.status !== "done").length}</strong><span>work items open</span></div><small>{workDone} completed</small></div>
      <div className="card whiteboard-summary-card"><span className="summary-icon life-icon"><Sparkles size={17} /></span><div><strong>{personalTasks.filter((task) => task.status !== "done").length}</strong><span>personal items open</span></div><small>{personalDone} completed</small></div>
      <div className="card whiteboard-summary-card ai-summary"><span className="summary-icon ai-icon"><Sparkles size={17} /></span><div><strong>MOCHI’S NEXT STEP</strong><span>{focusTask ? focusTask.title : "Everything is caught up."}</span></div><button className="mini-link" onClick={() => onNavigate("Mochi AI")}>Ask Mochi <ArrowRight size={14} /></button></div>
    </div>
    <div className="whiteboard-columns">
      <WhiteboardLane area="work" title="Internship work" subtitle="Weekdays · 8:00 AM–5:30 PM · lunch 1:00–2:00 PM" tasks={workTasks} completed={workDone} onAdd={() => onAddTask("work")} onEdit={onEdit} onAdvance={onAdvance} />
      <WhiteboardLane area="personal" title="Personal life" subtitle="Evenings and weekends · keep room for rest" tasks={personalTasks} completed={personalDone} onAdd={() => onAddTask("personal")} onEdit={onEdit} onAdvance={onAdvance} />
    </div>
    <section className="card whiteboard-timetable">
      <div className="card-heading"><div><span className="eyebrow">TODAY’S TIMETABLE</span><h2>{longDate()}</h2><p className="timetable-caption">Your fixed morning and work hours are kept in place; task estimates can be changed anytime.</p></div><button className="button quiet timetable-open" onClick={() => onNavigate("Planner")}>Full planner <ArrowRight size={15} /></button></div>
      <div className="whiteboard-schedule"><ScheduleList blocks={blocks} compact onAdd={onAddBlock} /></div>
    </section>
    <div className="whiteboard-disclosure"><Sparkles size={15} /><span><strong>Mochi plans gently.</strong> Suggestions use your task priorities, due dates, work hours and available time. This GitHub Pages version uses local planning rules; it does not connect to an external AI model.</span></div>
  </>;
}

function WhiteboardLane({ area, title, subtitle, tasks, completed, onAdd, onEdit, onAdvance }: {
  area: TaskArea; title: string; subtitle: string; tasks: Task[]; completed: number; onAdd: () => void;
  onEdit: (task?: Task) => void; onAdvance: (task: Task) => void;
}) {
  const sorted = [...tasks].sort((a, b) => {
    const status = { "in-progress": 0, todo: 1, done: 2 };
    const priority = { high: 0, medium: 1, low: 2 };
    return status[a.status] - status[b.status] || priority[a.priority] - priority[b.priority] || new Date(a.deadline ?? "2999-01-01").getTime() - new Date(b.deadline ?? "2999-01-01").getTime();
  });
  return <section className={`card whiteboard-lane ${area}`}>
    <div className="lane-heading"><div><span className="eyebrow">{area === "work" ? "FOCUS BEFORE 5:30" : "TIME FOR YOUR LIFE"}</span><h2>{title}</h2><p>{subtitle}</p></div><span className="lane-count">{completed}/{tasks.length} done</span></div>
    <div className="whiteboard-task-grid">
      {sorted.map((task) => <article className={`whiteboard-task ${task.status}`} key={task.id} style={{ "--task-color": categoryColors[task.category] } as React.CSSProperties}>
        <div className="wb-task-meta"><span className="wb-category">{categoryLabels[task.category]}</span><span className={`priority-pill ${task.priority}`}>{task.priority}</span></div>
        <button className="wb-task-title" onClick={() => onEdit(task)}>{task.title}</button>
        {task.notes && <p className="wb-task-note">{task.notes}</p>}
        <div className="wb-task-footer"><span><Clock3 size={13} /> {formatDuration(task.estimatedMinutes)}</span><span className={`wb-status ${task.status}`}>{task.status === "in-progress" ? "Doing" : task.status === "done" ? "Done" : "To do"}</span></div>
        <div className="wb-task-actions"><button onClick={() => onAdvance(task)}>{task.status === "todo" ? "Start task" : task.status === "in-progress" ? "Mark done" : "Reopen"}</button><button onClick={() => onEdit(task)}>Edit</button></div>
        {task.deadline && <span className="wb-deadline">Due {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(task.deadline))}</span>}
      </article>)}
      <button className="whiteboard-add-card" onClick={onAdd}><Plus size={17} /> Add {area === "work" ? "work" : "personal"} task</button>
    </div>
  </section>;
}

function countWeekdays(start: Date, end: Date) {
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let count = 0;
  while (day <= last) {
    const weekday = day.getDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
    day.setDate(day.getDate() + 1);
  }
  return count;
}

function Dashboard({ data, blocks, progress, openTasks, onNavigate, onEdit, onToggle, onAddBlock }: {
  data: MochimoData; blocks: ScheduleBlock[]; progress: number; openTasks: Task[];
  onNavigate: (view: View) => void; onEdit: (task?: Task) => void; onToggle: (task: Task) => void; onAddBlock: () => void;
}) {
  const importantTasks = [...openTasks].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)).slice(0, 3);
  return <>
    <PageHeading eyebrow={longDate()} title={`${greeting()}, Xin Yee`} subtitle="A little space to find your rhythm today." action={<button className="button primary desktop-add" onClick={() => onEdit()}><Plus size={17} /> Add a task</button>} />
    <div className="dashboard-grid">
      <section className="card welcome-card">
        <div className="welcome-copy"><span className="soft-label"><span className="live-dot" /> YOUR DAY, AT A GLANCE</span><h2>One step at a time.</h2><p>You’ve got this. Let’s make today feel a little more manageable.</p><button className="text-link" onClick={() => onNavigate("Planner")}>See your full day <ArrowRight size={15} /></button></div>
        <div className="progress-widget"><ProgressRing value={progress} /><span>daily progress</span><small>{data.tasks.filter((task) => task.status === "done").length} of {data.tasks.length} tasks done</small></div>
        <div className="welcome-decoration"><MochiFace /></div>
      </section>
      <section className="card metric-card available-card"><div className="metric-top"><span className="metric-icon green"><Clock3 size={18} /></span><span className="metric-label">FOCUS TIME TODAY</span></div><strong>{formatDuration(data.availableMinutes)}</strong><p>Room for focused tasks and personal plans</p><button className="mini-link" onClick={() => onNavigate("Time Budget")}>View your time budget <ArrowRight size={14} /></button></section>
      <section className="card metric-card focus-card"><div className="metric-top"><span className="metric-icon lilac"><Target size={18} /></span><span className="metric-label">ON YOUR LIST</span></div><strong>{openTasks.length}<small> tasks</small></strong><p>{openTasks.filter((task) => task.priority === "high").length} high-priority · {data.tasks.filter((task) => task.status === "done").length} finished</p><button className="mini-link" onClick={() => onNavigate("Tasks")}>Open task list <ArrowRight size={14} /></button></section>
      <section className="card section-card today-card">
        <div className="card-heading"><div><span className="eyebrow">YOUR PLAN, WITH ROOM TO BREATHE</span><h2>Today’s flow</h2></div><button className="icon-button" onClick={() => onNavigate("Planner")} aria-label="View planner"><ArrowRight size={18} /></button></div>
        <ScheduleList blocks={blocks.slice(0, 4)} compact onAdd={onAddBlock} />
      </section>
      <section className="card section-card budget-card">
        <div className="card-heading"><div><span className="eyebrow">A GENTLE BALANCE</span><h2>Time budget</h2></div><button className="icon-button" onClick={() => onNavigate("Time Budget")} aria-label="View time budget"><ArrowRight size={18} /></button></div>
        <BudgetSummary data={data} compact />
        <div className="budget-foot"><span>{formatDuration(getBudget(data).allocatedMinutes)} planned</span><span>{formatDuration(Math.max(0, getBudget(data).remainingMinutes))} breathing room</span></div>
      </section>
      <section className="card section-card important-card">
        <div className="card-heading"><div><span className="eyebrow">WHEN YOU’RE READY</span><h2>Worth a little focus</h2></div><button className="icon-button" onClick={() => onNavigate("Tasks")} aria-label="View tasks"><ArrowRight size={18} /></button></div>
        <TaskList tasks={importantTasks} onToggle={onToggle} onEdit={onEdit} compact />
      </section>
      <section className="assistant-suggestion">
        <div className="suggestion-mochi"><MochiFace /></div><div className="suggestion-content"><div><Sparkles size={14} /> MOCHI’S THOUGHT</div><p>{getSuggestion(openTasks, data.availableMinutes)}</p><span>Rule-based prototype suggestion · not real AI (yet)</span></div><button className="button assistant-button" onClick={() => onNavigate("Mochi AI")}>Ask Mochi <ArrowRight size={15} /></button>
      </section>
    </div>
  </>;
}

function TasksPage({ data, onAdd, onEdit, onToggle, onDelete }: { data: MochimoData; onAdd: () => void; onEdit: (task?: Task) => void; onToggle: (task: Task) => void; onDelete: (task: Task) => void }) {
  const [filter, setFilter] = useState<"all" | "todo" | "done">("all");
  const visibleTasks = data.tasks.filter((task) => filter === "all" || task.status === filter || (filter === "todo" && task.status === "in-progress"));
  const incomplete = data.tasks.filter((task) => task.status !== "done").length;
  return <>
    <PageHeading eyebrow="A LIST THAT WORKS FOR YOU" title="Your tasks" subtitle={`${incomplete} things to do, at your own pace.`} action={<button className="button primary" onClick={onAdd}><Plus size={17} /> Add a task</button>} />
    <section className="card tasks-page-card">
      <div className="list-toolbar"><div className="filter-tabs">{(["all", "todo", "done"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? `All (${data.tasks.length})` : value === "todo" ? `To do (${incomplete})` : `Done (${data.tasks.length - incomplete})`}</button>)}</div><span>Click a task to edit it</span></div>
      <TaskList tasks={visibleTasks} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} />
    </section>
    <div className="kind-reminder"><MochiFace size="small" /><span><strong>A gentle note</strong> Your estimate is a guide, not a promise. Adjust it whenever you need to.</span></div>
  </>;
}

function PlannerPage({ data, onAdd, onSavePlan }: { data: MochimoData; onAdd: (date: Date) => void; onSavePlan: (date: Date, blocks: ScheduleBlock[]) => void }) {
  const [selectedDay, setSelectedDay] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
  const days = weekDates(selectedDay);
  const savedBlocks = useMemo(() => data.schedule.filter((block) => sameDay(block.start, selectedDay)), [data.schedule, selectedDay]);
  const isDraft = savedBlocks.length === 0;
  const blocks = useMemo(() => isDraft ? createSuggestedSchedule(selectedDay, data.tasks) : savedBlocks, [data.tasks, isDraft, savedBlocks, selectedDay]);
  const planned = blocks.filter((block) => block.kind === "task").reduce((sum, block) => sum + minutesBetween(block.start, block.end), 0);
  const remaining = data.availableMinutes - planned;
  const workday = selectedDay.getDay() > 0 && selectedDay.getDay() < 6;
  const breakMinutes = blocks.filter((block) => block.kind === "break").reduce((sum, block) => sum + minutesBetween(block.start, block.end), 0);
  const rangeStart = days[0];
  const rangeEnd = days[6];
  function shiftWeek(amount: number) {
    const next = new Date(selectedDay);
    next.setDate(next.getDate() + amount * 7);
    setSelectedDay(next);
  }
  return <>
    <PageHeading eyebrow={longDate(selectedDay)} title="Your weekly planner" subtitle="Keep your work hours fixed, then place a few realistic tasks around lunch and personal time." action={<button className="button primary" onClick={() => onAdd(selectedDay)}><Plus size={17} /> Add time block</button>} />
    <div className="planner-week-nav"><button className="icon-button" aria-label="Previous week" onClick={() => shiftWeek(-1)}><ChevronLeft size={17} /></button><strong>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(rangeStart)} – {new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(rangeEnd)}</strong><button className="icon-button" aria-label="Next week" onClick={() => shiftWeek(1)}><ChevronRight size={17} /></button></div>
    <div className="planner-week-strip" aria-label="Choose a day">
      {days.map((day) => <button key={day.toISOString()} className={sameDay(day.toISOString(), selectedDay) ? "active" : ""} onClick={() => setSelectedDay(day)}>
        <span>{new Intl.DateTimeFormat("en", { weekday: "short" }).format(day)}</span><strong>{day.getDate()}</strong><small>{sameDay(day.toISOString(), new Date()) ? "Today" : ""}</small>
      </button>)}
    </div>
    <div className="planner-controls"><span>{isDraft ? "Suggested outline · not saved yet" : "Saved plan"}{workday ? " · Workday" : " · Personal day"}</span><div>{isDraft && <button className="button quiet" onClick={() => onSavePlan(selectedDay, blocks)}><Check size={15} /> Save this plan</button>}<button className="button quiet" onClick={() => onAdd(selectedDay)}><Plus size={15} /> Add time block</button></div></div>
    <div className="planner-layout">
      <section className="card planner-card"><div className="card-heading planner-heading"><div><span className="eyebrow">{workday ? "WORK + PERSONAL TIME" : "PERSONAL TIME + REST"}</span><h2>{new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(selectedDay)}</h2></div><span className="today-chip"><span className="live-dot" />{workday ? "8:00–5:30" : "Open day"}</span></div>
        <div className="timeline-hours"><span>7 AM</span><span>10 AM</span><span>1 PM</span><span>4 PM</span><span>7 PM</span><span>10 PM</span></div>
        <div className="timeline-list">{addOpenTime(blocks).map((item) => item.type === "gap" ? <div className="timeline-gap" key={item.id}><div className="timeline-time">{formatTime(item.start)}<span>{formatTime(item.end)}</span></div><div className="timeline-gap-line"><i /><span>{formatDuration(minutesBetween(item.start, item.end))} open · unscheduled time</span></div></div> : <div className={`timeline-block ${item.kind}`} key={item.id}><div className="timeline-time">{formatTime(item.start)}<span>{formatTime(item.end)}</span></div><div className="timeline-event" style={{ "--category-color": categoryColors[item.category] } as React.CSSProperties}><span className="event-kicker">{categoryLabels[item.category]} · {formatDuration(minutesBetween(item.start, item.end))}</span><strong>{item.title}</strong>{item.notes && <small>{item.notes}</small>}</div></div>)}</div>
        <button className="add-schedule planner-add" onClick={() => onAdd(selectedDay)}><Plus size={15} /> Add a time block</button>
      </section>
      <aside className="planner-aside">
        <section className="card planner-day-card"><span className="eyebrow">YOUR TIME, YOURS</span><h3>Keep the plan kind.</h3><p>{workday ? "Your work window stays 8:00 AM–5:30 PM, with lunch protected from 1:00–2:00 PM." : "Keep this day light: one personal focus block, then plenty of room to rest or play."}</p><div className="planner-stat"><span><Clock3 size={15} /> Focus blocks</span><strong>{formatDuration(planned)}</strong></div><div className="planner-stat"><span><ArrowDownRight size={15} /> Unplanned focus time</span><strong className={remaining < 0 ? "text-danger" : ""}>{formatDuration(Math.abs(remaining))}{remaining < 0 ? " over" : ""}</strong></div><div className="planner-stat"><span><Coffee size={15} /> Breaks</span><strong>{formatDuration(breakMinutes)}</strong></div></section>
        <section className="card category-guide"><span className="eyebrow">YOUR LIFE, IN COLORS</span><h3>Different parts of you</h3>{(Object.keys(categoryLabels) as Category[]).filter((category) => category !== "free").map((category) => <div key={category}><i style={{ backgroundColor: categoryColors[category] }} /><span>{categoryLabels[category]}</span></div>)}</section>
      </aside>
    </div>
  </>;
}

function BudgetPage({ data, onChangeAvailable }: { data: MochimoData; onChangeAvailable: (minutes: number) => void }) {
  const budget = getBudget(data);
  return <>
    <PageHeading eyebrow="THERE’S ONLY SO MUCH OF YOU" title="Your time budget" subtitle="See where your hours are going—and where they’re still yours." />
    <div className="budget-page-grid">
      <section className="card budget-overview"><div className="budget-overview-heading"><div><span className="eyebrow">TODAY’S TIME</span><h2>A day with breathing room.</h2><p>Change the available time to match what today really looks like.</p></div><div className="large-clock"><Clock3 size={23} /></div></div><label className="available-control"><span>Available time today</span><div><input type="range" min="60" max="960" step="30" value={data.availableMinutes} onChange={(e) => onChangeAvailable(Number(e.target.value))} aria-label="Available time today" /><strong>{formatDuration(data.availableMinutes)}</strong></div></label><BudgetSummary data={data} /><div className={`budget-status ${budget.overScheduled ? "over" : ""}`}><span>{budget.overScheduled ? "A gentle heads-up" : "Looking balanced"}</span><p>{budget.overScheduled ? `Your plan is ${formatDuration(Math.abs(budget.remainingMinutes))} over what you’ve got available. Consider moving something to another day.` : `You’ve left ${formatDuration(budget.remainingMinutes)} unscheduled. That’s room for breaks, transitions, and the unexpected.`}</p></div></section>
      <section className="card allocation-card"><div className="card-heading"><div><span className="eyebrow">WHERE YOUR HOURS GO</span><h2>By life area</h2></div><TrendingUp size={19} className="subtle-icon" /></div>{(Object.keys(categoryLabels) as Category[]).filter((category) => category !== "free").map((category) => {
        const minutes = budget.totals[category];
        const percentage = budget.allocatedMinutes > 0 ? Math.round(minutes / budget.allocatedMinutes * 100) : 0;
        return <div className="allocation-row" key={category}><div className="allocation-label"><i style={{ background: categoryColors[category] }} /><span>{categoryLabels[category]}</span><strong>{formatDuration(minutes)}</strong></div><div className="allocation-track"><span style={{ width: `${budget.allocatedMinutes ? minutes / budget.allocatedMinutes * 100 : 0}%`, background: categoryColors[category] }} /></div><small>{percentage}% of planned time</small></div>;
      })}</section>
    </div>
    <div className="budget-footnote"><span><Sparkles size={16} /> Your budget is a compass, not a rulebook.</span><span>Based on today’s schedule blocks</span></div>
  </>;
}

function AssistantPage({ data }: { data: MochimoData }) {
  const prompts = ["Plan my workday", "I have 1 hour after work", "Help me balance work and games", "I have too many tasks"];
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "mochi", text: "Hi Xin Yee! I’m Mochi, your planning buddy. I can sort your task list and draft a day around your work hours, lunch and personal time. 🌱" }]);
  const [input, setInput] = useState("");
  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((current) => [...current, { role: "you", text: trimmed }, { role: "mochi", text: getAssistantResponse(trimmed, data) }]);
    setInput("");
  }
  function submit(event: FormEvent) { event.preventDefault(); send(input); }
  return <>
    <PageHeading eyebrow="A LITTLE HELP, WHEN YOU NEED IT" title="Mochi is here" subtitle="Think it through together. No pressure, no perfect plans." />
    <div className="assistant-page-layout">
      <section className="card chat-card">
        <div className="chat-header"><MochiFace size="small" /><div><strong>Mochi</strong><span><i /> Your planning buddy · prototype</span></div><span className="prototype-tag">RULE-BASED</span></div>
        <div className="chat-messages">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${index}-${message.role}`}><div className="chat-avatar">{message.role === "mochi" ? <MochiFace size="small" /> : "X"}</div><div><span>{message.role === "mochi" ? "Mochi" : "You"}</span><p>{message.text}</p></div></div>)}</div>
        <div className="prompt-area"><span className="eyebrow">TRY ASKING</span><div className="prompt-chips">{prompts.map((prompt) => <button key={prompt} onClick={() => send(prompt)}>{prompt}<ArrowRight size={13} /></button>)}</div></div>
        <form className="chat-input" onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Tell Mochi what’s on your mind…" aria-label="Message Mochi" /><button type="submit" disabled={!input.trim()} aria-label="Send message"><ArrowRight size={18} /></button></form>
      </section>
      <aside className="assistant-aside"><section className="mochi-intro-card"><div className="mochi-float"><MochiFace /></div><span className="eyebrow">A SMALL NOTE FROM MOCHI</span><h3>We’ll figure it out together.</h3><p>I look at your task list and available time to suggest a realistic next step. You’re always in charge of the plan.</p><div className="intro-divider" /><div className="prototype-disclosure"><Sparkles size={15} /><span><strong>Prototype mode</strong>This version uses simple local rules—not a real AI model. Your messages stay in this browser.</span></div></section><section className="card assistant-context"><span className="eyebrow">WHAT MOCHI CAN SEE</span><div><Check size={15} /> Your {data.tasks.length} tasks</div><div><Check size={15} /> {formatDuration(data.availableMinutes)} available today</div><div className="not-yet"><span>·</span> No external AI or private data sharing</div></section></aside>
    </div>
  </>;
}

function addOpenTime(blocks: ScheduleBlock[]) {
  const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start));
  const result: ({ type: "block" } & ScheduleBlock | { type: "gap"; id: string; start: string; end: string })[] = [];
  const dayStart = sorted.length ? new Date(sorted[0].start) : new Date();
  const weekend = dayStart.getDay() === 0 || dayStart.getDay() === 6;
  dayStart.setHours(weekend ? 9 : 7, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(22, 0, 0, 0);
  let cursor = dayStart.getTime();
  for (let index = 0; index < sorted.length; index += 1) {
    const block = sorted[index];
    const start = new Date(block.start).getTime();
    const end = new Date(block.end).getTime();
    if (start - cursor >= 30 * 60000) {
      result.push({ type: "gap", id: `gap-before-${block.id}`, start: new Date(cursor).toISOString(), end: block.start });
    }
    result.push({ ...block, type: "block" });
    cursor = Math.max(cursor, end);
  }
  if (dayEnd.getTime() - cursor >= 30 * 60000) {
    result.push({ type: "gap", id: "gap-after-last", start: new Date(cursor).toISOString(), end: dayEnd.toISOString() });
  }
  return result;
}

function sameDay(value: string, date: Date) {
  const candidate = new Date(value);
  return candidate.getFullYear() === date.getFullYear() && candidate.getMonth() === date.getMonth() && candidate.getDate() === date.getDate();
}
function longDate(date: Date = new Date()) {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}
function weekDates(anchor: Date) {
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}
function shortDate() {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date());
}
function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}
function priorityRank(priority: Task["priority"]) {
  return priority === "high" ? 0 : priority === "medium" ? 1 : 2;
}
