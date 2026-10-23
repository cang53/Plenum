"use client";

import { useEffect, useState } from "react";
import { DAY_TARGET, WEEK_TARGET, sumHours, targetState } from "@/domain/timesheet";

type Task = { id: string; title: string };
type Labels = { task: string; total: string; week: string; target: string; over: string; timer: string; timerTask: string; timerStart: string; timerStop: string; timerOff: string };

const key = (t: string, d: string) => `${t}:${d}`;

// Editable week with live row and day totals, target colouring and a timer that adds elapsed time to today's cell. Cells are named so the form posts them as before.
export function WeekGrid({ tasks, days, today, initial, locked, labels }: { tasks: Task[]; days: string[]; today: string; initial: Record<string, number>; locked: boolean; labels: Labels }) {
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v)])));
  const [timer, setTimer] = useState<{ task: string; start: number } | null>(null);
  const [pick, setPick] = useState(tasks[0]?.id ?? "");
  const [now, setNow] = useState(0); // set when the timer starts or loads, then every second
  useEffect(() => {
    // Browser storage cannot be read during server render, so the saved timer loads after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const s = JSON.parse(localStorage.getItem("plenum-timer") ?? "null"); if (s?.task && s.start) { setTimer(s); setNow(Date.now()); } } catch { /* no saved timer */ }
  }, []);
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timer]);
  const num = (t: string, d: string) => Number(vals[key(t, d)]?.replace(",", ".")) || 0;
  const rowTotal = (t: string) => sumHours(days.map((d) => num(t, d)));
  const dayTotal = (d: string) => sumHours(tasks.map((t) => num(t.id, d)));
  const weekTotal = sumHours(tasks.map((t) => rowTotal(t.id)));
  const inWeek = days.includes(today);
  const save = (t: typeof timer) => { try { if (t) localStorage.setItem("plenum-timer", JSON.stringify(t)); else localStorage.removeItem("plenum-timer"); } catch { /* private mode */ } };
  const start = () => { const t = { task: pick, start: Date.now() }; setTimer(t); setNow(t.start); save(t); };
  const stop = () => {
    if (!timer) return;
    const add = Math.max(0.25, Math.round(((Date.now() - timer.start) / 3600000) * 4) / 4);
    setVals((v) => ({ ...v, [key(timer.task, today)]: String(sumHours([Number(v[key(timer.task, today)]) || 0, add])) }));
    setTimer(null);
    save(null);
  };
  const clock = timer ? new Date(Math.max(0, now - timer.start)).toISOString().slice(11, 19) : "";
  return (
    <>
      {!locked && (
        <div className="sl-state sl-bar" role="group" aria-label={labels.timer}>
          <select className="field" aria-label={labels.timerTask} value={timer?.task ?? pick} disabled={!!timer} onChange={(e) => setPick(e.target.value)}>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          {timer && <output>{clock}</output>}
          {timer ? <button type="button" className="btn" disabled={!inWeek} onClick={stop}>{labels.timerStop}</button> : <button type="button" className="btn" onClick={start}>{labels.timerStart}</button>}
          {timer && !inWeek && <span className="hint">{labels.timerOff}</span>}
        </div>
      )}
        <table className="ts-grid">
          <thead>
            <tr><th scope="col">{labels.task}</th>{days.map((d) => <th key={d} scope="col" aria-current={d === today ? "date" : undefined}>{d.slice(5)}</th>)}<th scope="col">{labels.total}</th></tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <th scope="row">{task.title}</th>
                {days.map((d) => (
                  <td key={d}><input className="field" type="number" inputMode="decimal" name={`h:${task.id}:${d}`} aria-label={`${task.title} ${d}`} min={0} max={24} step={0.25} readOnly={locked} value={vals[key(task.id, d)] ?? ""} onChange={(e) => setVals({ ...vals, [key(task.id, d)]: e.target.value })} /></td>
                ))}
                <td className="ts-num">{rowTotal(task.id)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">{labels.total}</th>
              {days.map((d) => {
                const total = dayTotal(d);
                const state = targetState(total, DAY_TARGET);
                return <td key={d} className="ts-num" data-state={state}>{total}{state === "over" && <span className="sr-only"> {labels.over}</span>}</td>;
              })}
              <td className="ts-num" data-state={targetState(weekTotal, WEEK_TARGET, true)}>{weekTotal}</td>
            </tr>
          </tfoot>
        </table>
      <p><strong>{labels.week} {weekTotal}</strong> {labels.target}</p>
    </>
  );
}
