import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Coffee,
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
  getSuggestion,
  minutesBetween,
} from "./services/planner";
import { loadData, saveData } from "./services/storage";
import type { Category, MochimoData, ScheduleBlock, Task } from "./types";

type ChatMessage = { role: "mochi" | "you"; text: string };

export default function App() {
  const [data, setData] = useState<MochimoData>(loadData);
  const [activeView, setActiveView] = useState<View>("Dashboard");
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);

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

  function openTask(task?: Task) {
    setTaskToEdit(task);
    setTaskDialogOpen(true);
  }

  return (
    <div className="app-shell">
      <Sidebar active={activeView} onNavigate={setActiveView} />
      <main className="main-area">
        <div className="mobile-brand"><MochiFace size="small" /><span>mochimo<span className="brand-period">.</span></span><span className="mobile-day">{shortDate()}</span></div>
        <div className="mobile-nav">
          {(["Dashboard", "Tasks", "Planner", "Time Budget", "Mochi AI"] as View[]).map((view) => (
            <button key={view} className={activeView === view ? "active" : ""} onClick={() => setActiveView(view)}>{view === "Time Budget" ? "Budget" : view === "Mochi AI" ? "Mochi" : view}</button>
          ))}
        </div>
        <div className="content-wrap">
          {activeView === "Dashboard" && <Dashboard data={data} blocks={todayBlocks} progress={progress} openTasks={todayTasks} onNavigate={setActiveView} onEdit={openTask} onToggle={toggleTask} onAddBlock={() => setScheduleDialogOpen(true)} />}
          {activeView === "Tasks" && <TasksPage data={data} onAdd={() => openTask()} onEdit={openTask} onToggle={toggleTask} onDelete={deleteTask} />}
          {activeView === "Planner" && <PlannerPage data={data} blocks={todayBlocks} onAdd={() => setScheduleDialogOpen(true)} />}
          {activeView === "Time Budget" && <BudgetPage data={data} onChangeAvailable={(minutes) => setData((current) => ({ ...current, availableMinutes: minutes }))} />}
          {activeView === "Mochi AI" && <AssistantPage data={data} />}
        </div>
        <footer className="footer-note"><span>Made for your real life, not an ideal one.</span><span>✳ Mochimo prototype · your data stays in this browser</span></footer>
      </main>
      {taskDialogOpen && <TaskDialog task={taskToEdit} onClose={() => { setTaskDialogOpen(false); setTaskToEdit(undefined); }} onSave={saveTask} />}
      {scheduleDialogOpen && <ScheduleDialog onClose={() => setScheduleDialogOpen(false)} onSave={saveSchedule} />}
    </div>
  );
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
      <section className="card metric-card available-card"><div className="metric-top"><span className="metric-icon green"><Clock3 size={18} /></span><span className="metric-label">TIME FOR YOU TODAY</span></div><strong>{formatDuration(data.availableMinutes)}</strong><p>Time you’ve set aside for today</p><button className="mini-link" onClick={() => onNavigate("Time Budget")}>View your time budget <ArrowRight size={14} /></button></section>
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

function PlannerPage({ data, blocks, onAdd }: { data: MochimoData; blocks: ScheduleBlock[]; onAdd: () => void }) {
  const planned = blocks.reduce((sum, block) => sum + minutesBetween(block.start, block.end), 0);
  const remaining = data.availableMinutes - planned;
  return <>
    <PageHeading eyebrow={longDate()} title="Your daily planner" subtitle="A flexible shape for the day, with space left unplanned." action={<button className="button primary" onClick={onAdd}><Plus size={17} /> Add time block</button>} />
    <div className="planner-layout">
      <section className="card planner-card"><div className="card-heading planner-heading"><div><span className="eyebrow">TODAY’S TIMELINE</span><h2>What your day looks like</h2></div><span className="today-chip"><span className="live-dot" /> Today</span></div>
        <div className="timeline-hours"><span>9 AM</span><span>12 PM</span><span>3 PM</span><span>6 PM</span><span>9 PM</span></div>
        {blocks.length === 0 ? <div className="empty-planner"><CalendarDays size={26} /><p>Your schedule is open.</p><span>Add a block when you’re ready, or enjoy the unscheduled time.</span></div> : <div className="timeline-list">{addOpenTime(blocks).map((item) => item.type === "gap" ? <div className="timeline-gap" key={item.id}><div className="timeline-time">{formatTime(item.start)}<span>{formatTime(item.end)}</span></div><div className="timeline-gap-line"><i /><span>{formatDuration(minutesBetween(item.start, item.end))} open · unscheduled time</span></div></div> : <div className={`timeline-block ${item.kind}`} key={item.id}><div className="timeline-time">{formatTime(item.start)}<span>{formatTime(item.end)}</span></div><div className="timeline-event" style={{ "--category-color": categoryColors[item.category] } as React.CSSProperties}><span className="event-kicker">{categoryLabels[item.category]} · {formatDuration(minutesBetween(item.start, item.end))}</span><strong>{item.title}</strong>{item.notes && <small>{item.notes}</small>}</div></div>)}</div>}
        <button className="add-schedule planner-add" onClick={onAdd}><Plus size={15} /> Add a time block</button>
      </section>
      <aside className="planner-aside">
        <section className="card planner-day-card"><span className="eyebrow">YOUR TIME, YOURS</span><h3>Keep the plan kind.</h3><p>Leave a little margin for transitions, surprises, and simply being human.</p><div className="planner-stat"><span><Clock3 size={15} /> Planned</span><strong>{formatDuration(planned)}</strong></div><div className="planner-stat"><span><ArrowDownRight size={15} /> Unscheduled</span><strong className={remaining < 0 ? "text-danger" : ""}>{formatDuration(Math.abs(remaining))}{remaining < 0 ? " over" : ""}</strong></div><div className="planner-stat"><span><Coffee size={15} /> Breaks today</span><strong>{formatDuration(blocks.filter((block) => block.kind === "break").reduce((sum, block) => sum + minutesBetween(block.start, block.end), 0))}</strong></div></section>
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
  const prompts = ["I have 2 hours tonight. What should I work on?", "Help me plan tomorrow.", "I have too many tasks.", "What should I focus on first?"];
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "mochi", text: "Hi Xin Yee! I’m Mochi, your little planning buddy. Tell me what kind of time you have, and we’ll find a gentle place to start. 🌱" }]);
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
  const dayStart = new Date();
  dayStart.setHours(9, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setHours(21, 0, 0, 0);
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
function longDate() {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date());
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
