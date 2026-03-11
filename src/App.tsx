import { useState, useEffect, useRef } from "react";

// ─── Data Model ───────────────────────────────────────────────────────────────
// { id, text, section, done, createdAt, completedAt }
// localStorage key: "daytask_data" → { date: "YYYY-MM-DD", tasks: [...] }

const TODAY = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 9);

const SECTIONS = [
  { id: "morning",   label: "Morning",   icon: "🌅", color: "#f59e0b" },
  { id: "afternoon", label: "Afternoon", icon: "☀️", color: "#ef4444" },
  { id: "evening",   label: "Evening",   icon: "🌙", color: "#6366f1" },
  { id: "general",   label: "General",   icon: "📋", color: "#10b981" },
];

function loadData() {
  try {
    const raw = localStorage.getItem("daytask_data");
    if (!raw) return { date: TODAY(), tasks: [], archive: [] };
    const data = JSON.parse(raw);
    // Daily reset: archive yesterday's tasks, start fresh
    if (data.date !== TODAY()) {
      const archive = data.archive || [];
      archive.unshift({ date: data.date, tasks: data.tasks });
      return { date: TODAY(), tasks: [], archive: archive.slice(0, 30) };
    }
    return data;
  } catch {
    return { date: TODAY(), tasks: [], archive: [] };
  }
}

function saveData(data) {
  localStorage.setItem("daytask_data", JSON.stringify(data));
}

// ─── Styles (injected once) ────────────────────────────────────────────────────
const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0d0d0f;
    --surface: #16161a;
    --surface2: #1e1e24;
    --border: rgba(255,255,255,0.07);
    --text: #e8e8f0;
    --muted: #6b6b80;
    --accent: #c8f135;
    --accent2: #f135c8;
    --serif: 'Instrument Serif', Georgia, serif;
    --mono: 'DM Mono', monospace;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--mono); }

  .app {
    min-height: 100vh;
    max-width: 680px;
    margin: 0 auto;
    padding: 0 16px 120px;
    position: relative;
  }

  /* ── Header ── */
  .header {
    padding: 36px 0 28px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 32px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .header-left {}
  .date-label {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 6px;
  }
  .day-title {
    font-family: var(--serif);
    font-size: clamp(32px, 7vw, 48px);
    font-weight: 400;
    line-height: 1;
    color: var(--text);
  }
  .day-title em { font-style: italic; color: var(--accent); }
  .header-stats {
    text-align: right;
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.05em;
  }
  .stat-num {
    font-family: var(--serif);
    font-size: 28px;
    color: var(--text);
    display: block;
    font-style: italic;
    line-height: 1;
  }

  /* ── Progress bar ── */
  .progress-wrap {
    height: 2px;
    background: var(--border);
    border-radius: 2px;
    margin-bottom: 36px;
    overflow: hidden;
  }
  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent2));
    border-radius: 2px;
    transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* ── Section ── */
  .section { margin-bottom: 40px; }
  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
    cursor: pointer;
    user-select: none;
  }
  .section-icon { font-size: 14px; }
  .section-name {
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
    font-weight: 500;
  }
  .section-count {
    font-size: 10px;
    color: var(--muted);
    margin-left: auto;
    opacity: 0.5;
  }
  .section-line {
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  /* ── Task ── */
  .task-list { display: flex; flex-direction: column; gap: 2px; }

  .task-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid transparent;
    transition: all 0.15s ease;
    cursor: pointer;
    group: true;
    position: relative;
  }
  .task-item:hover {
    background: var(--surface);
    border-color: var(--border);
  }
  .task-item.done {
    opacity: 0.4;
  }

  .task-check {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px solid var(--muted);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    background: transparent;
    cursor: pointer;
  }
  .task-check.checked {
    background: var(--accent);
    border-color: var(--accent);
  }
  .task-check.checked::after {
    content: '';
    width: 5px;
    height: 9px;
    border: 1.5px solid #0d0d0f;
    border-top: none;
    border-left: none;
    transform: rotate(45deg) translateY(-1px);
    display: block;
  }

  .task-text {
    font-size: 14px;
    font-weight: 300;
    color: var(--text);
    letter-spacing: 0.01em;
    flex: 1;
    transition: all 0.2s ease;
  }
  .task-item.done .task-text {
    text-decoration: line-through;
    color: var(--muted);
  }

  .task-delete {
    opacity: 0;
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 16px;
    padding: 2px 6px;
    border-radius: 4px;
    transition: all 0.15s;
    font-family: var(--mono);
  }
  .task-item:hover .task-delete { opacity: 1; }
  .task-delete:hover { color: #ef4444; background: rgba(239,68,68,0.1); }

  /* ── Empty state ── */
  .empty-section {
    padding: 10px 16px;
    font-size: 12px;
    color: var(--muted);
    font-style: italic;
    opacity: 0.5;
  }

  /* ── Quick Add (inline per section) ── */
  .inline-add {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-radius: 8px;
    border: 1px dashed rgba(255,255,255,0.08);
    margin-top: 6px;
    transition: border-color 0.2s;
    cursor: text;
  }
  .inline-add:focus-within {
    border-color: rgba(200,241,53,0.3);
    background: rgba(200,241,53,0.02);
  }
  .inline-add-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1.5px dashed var(--muted);
    flex-shrink: 0;
    opacity: 0.4;
  }
  .inline-add input {
    background: none;
    border: none;
    outline: none;
    font-family: var(--mono);
    font-size: 14px;
    font-weight: 300;
    color: var(--text);
    width: 100%;
    letter-spacing: 0.01em;
  }
  .inline-add input::placeholder { color: var(--muted); opacity: 0.5; }

  /* ── FAB ── */
  .fab {
    position: fixed;
    bottom: 32px;
    right: max(16px, calc((100vw - 680px) / 2 + 16px));
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--accent);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    color: #0d0d0f;
    box-shadow: 0 4px 24px rgba(200,241,53,0.3);
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
    z-index: 100;
  }
  .fab:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 32px rgba(200,241,53,0.45);
  }
  .fab.open { transform: rotate(45deg); background: var(--accent2); box-shadow: 0 4px 24px rgba(241,53,200,0.3); }

  /* ── Modal ── */
  .modal-backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0 16px 32px;
    animation: fadeIn 0.2s ease;
  }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 28px 24px;
    width: 100%;
    max-width: 648px;
    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .modal-title {
    font-family: var(--serif);
    font-size: 22px;
    font-style: italic;
    margin-bottom: 20px;
    color: var(--text);
  }

  .modal-input {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 16px;
    font-family: var(--mono);
    font-size: 15px;
    font-weight: 300;
    color: var(--text);
    outline: none;
    margin-bottom: 16px;
    transition: border-color 0.2s;
    letter-spacing: 0.01em;
  }
  .modal-input:focus { border-color: rgba(200,241,53,0.4); }

  .section-pills {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 20px;
  }
  .pill {
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-family: var(--mono);
    transition: all 0.15s;
  }
  .pill:hover { border-color: rgba(255,255,255,0.2); color: var(--text); }
  .pill.active { border-color: var(--accent); color: var(--accent); background: rgba(200,241,53,0.08); }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .btn {
    padding: 10px 20px;
    border-radius: 8px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.08em;
    cursor: pointer;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--muted);
    transition: all 0.15s;
  }
  .btn:hover { color: var(--text); border-color: rgba(255,255,255,0.2); }
  .btn.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #0d0d0f;
    font-weight: 500;
  }
  .btn.primary:hover { background: #d4f54d; }
  .btn.primary:disabled { opacity: 0.4; cursor: not-allowed; }

  /* ── Archive tab ── */
  .nav {
    display: flex;
    gap: 0;
    margin-bottom: 32px;
    border-bottom: 1px solid var(--border);
  }
  .nav-tab {
    padding: 10px 0;
    margin-right: 28px;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--muted);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    background: none;
    border-top: none;
    border-left: none;
    border-right: none;
    font-family: var(--mono);
    transition: all 0.15s;
  }
  .nav-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .nav-tab:hover:not(.active) { color: var(--text); }

  /* ── Archive view ── */
  .archive-day { margin-bottom: 32px; }
  .archive-date {
    font-size: 10px;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--muted);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .archive-date::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }
  .archive-task {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    font-size: 13px;
    font-weight: 300;
    color: var(--muted);
    border-bottom: 1px solid rgba(255,255,255,0.03);
  }
  .archive-task.done-arc { text-decoration: line-through; opacity: 0.4; }
  .archive-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--border);
  }
  .archive-dot.done-arc { background: var(--accent); }

  .empty-archive {
    text-align: center;
    padding: 60px 0;
    font-family: var(--serif);
    font-style: italic;
    font-size: 20px;
    color: var(--muted);
    opacity: 0.4;
  }

  /* ── Completion celebration ── */
  .all-done {
    text-align: center;
    padding: 32px 0;
    animation: fadeIn 0.5s ease;
  }
  .all-done-emoji { font-size: 40px; margin-bottom: 12px; }
  .all-done-text {
    font-family: var(--serif);
    font-size: 24px;
    font-style: italic;
    color: var(--accent);
  }
  .all-done-sub { font-size: 12px; color: var(--muted); margin-top: 6px; letter-spacing: 0.05em; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  /* ── Task enter animation ── */
  .task-enter { animation: taskIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
  @keyframes taskIn {
    from { opacity: 0; transform: translateX(-8px); }
    to { opacity: 1; transform: translateX(0); }
  }
`;

// ─── Components ───────────────────────────────────────────────────────────────

function CheckCircle({ checked, onClick }) {
  return (
    <div
      className={`task-check${checked ? " checked" : ""}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    />
  );
}

function TaskItem({ task, onToggle, onDelete }) {
  return (
    <div className={`task-item task-enter${task.done ? " done" : ""}`}>
      <CheckCircle checked={task.done} onClick={onToggle} />
      <span className="task-text">{task.text}</span>
      <button className="task-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>×</button>
    </div>
  );
}

function InlineAdd({ sectionId, onAdd }) {
  const [val, setVal] = useState("");
  const ref = useRef();

  const submit = () => {
    const t = val.trim();
    if (!t) return;
    onAdd(t, sectionId);
    setVal("");
    ref.current?.focus();
  };

  return (
    <div className="inline-add" onClick={() => ref.current?.focus()}>
      <div className="inline-add-dot" />
      <input
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setVal(""); }}
        placeholder="Add task… (Enter to save)"
      />
    </div>
  );
}

function AddModal({ onAdd, onClose }) {
  const [text, setText] = useState("");
  const [section, setSection] = useState("general");
  const ref = useRef();

  useEffect(() => { ref.current?.focus(); }, []);

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onAdd(t, section);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">New task for today</div>
        <input
          ref={ref}
          className="modal-input"
          placeholder="What needs to get done?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        />
        <div className="section-pills">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`pill${section === s.id ? " active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit} disabled={!text.trim()}>Add task</button>
        </div>
      </div>
    </div>
  );
}

function ArchiveView({ archive }) {
  if (!archive.length) return <div className="empty-archive">No past days yet.</div>;
  return (
    <div>
      {archive.map((day) => (
        <div key={day.date} className="archive-day">
          <div className="archive-date">{new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}</div>
          {day.tasks.length === 0 && <div style={{ color: "var(--muted)", fontSize: 12, paddingBottom: 8, opacity: 0.5 }}>No tasks recorded</div>}
          {day.tasks.map((t) => (
            <div key={t.id} className={`archive-task${t.done ? " done-arc" : ""}`}>
              <div className={`archive-dot${t.done ? " done-arc" : ""}`} />
              {t.text}
              <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {SECTIONS.find(s => s.id === t.section)?.label}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [data, setData] = useState(() => loadData());
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState("today");

  // Persist on every change
  useEffect(() => { saveData(data); }, [data]);

  // Midnight reset check
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        if (prev.date !== TODAY()) {
          const archive = [{ date: prev.date, tasks: prev.tasks }, ...(prev.archive || [])].slice(0, 30);
          const next = { date: TODAY(), tasks: [], archive };
          saveData(next);
          return next;
        }
        return prev;
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const addTask = (text, section) => {
    const task = { id: uid(), text, section, done: false, createdAt: Date.now(), completedAt: null };
    setData((prev) => ({ ...prev, tasks: [...prev.tasks, task] }));
  };

  const toggleTask = (id) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null } : t
      ),
    }));
  };

  const deleteTask = (id) => {
    setData((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
  };

  const tasks = data.tasks;
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const allDone = total > 0 && done === total;

  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <>
      <style>{STYLE}</style>
      <div className="app">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <div className="date-label">{dateStr} · Daily tasks</div>
            <div className="day-title">{dayName.slice(0, -3)}<em>{dayName.slice(-3)}</em></div>
          </div>
          <div className="header-stats">
            <span className="stat-num">{done}/{total}</span>
            completed
          </div>
        </div>

        {/* Nav */}
        <div className="nav">
          <button className={`nav-tab${tab === "today" ? " active" : ""}`} onClick={() => setTab("today")}>Today</button>
          <button className={`nav-tab${tab === "archive" ? " active" : ""}`} onClick={() => setTab("archive")}>Archive</button>
        </div>

        {tab === "archive" ? (
          <ArchiveView archive={data.archive || []} />
        ) : (
          <>
            {/* Progress */}
            <div className="progress-wrap">
              <div className="progress-bar" style={{ width: `${pct}%` }} />
            </div>

            {/* All done celebration */}
            {allDone && (
              <div className="all-done">
                <div className="all-done-emoji">✦</div>
                <div className="all-done-text">All done for today.</div>
                <div className="all-done-sub">Rest well — you earned it.</div>
              </div>
            )}

            {/* Sections */}
            {SECTIONS.map((sec) => {
              const secTasks = tasks.filter((t) => t.section === sec.id);
              const secDone = secTasks.filter((t) => t.done).length;
              return (
                <div key={sec.id} className="section">
                  <div className="section-header">
                    <span className="section-icon">{sec.icon}</span>
                    <span className="section-name">{sec.label}</span>
                    <div className="section-line" />
                    {secTasks.length > 0 && (
                      <span className="section-count">{secDone}/{secTasks.length}</span>
                    )}
                  </div>
                  <div className="task-list">
                    {secTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onToggle={() => toggleTask(task.id)}
                        onDelete={() => deleteTask(task.id)}
                      />
                    ))}
                  </div>
                  <InlineAdd sectionId={sec.id} onAdd={addTask} />
                </div>
              );
            })}

            {/* Empty state for new users */}
            {total === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0 40px", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18, color: "var(--muted)", opacity: 0.5 }}>
                What's on your plate today?
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      {tab === "today" && (
        <button className={`fab${showModal ? " open" : ""}`} onClick={() => setShowModal(!showModal)}>
          +
        </button>
      )}

      {/* Modal */}
      {showModal && <AddModal onAdd={addTask} onClose={() => setShowModal(false)} />}
    </>
  );
}