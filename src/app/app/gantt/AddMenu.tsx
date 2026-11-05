"use client";

import { useState } from "react";
import type { GanttGroup } from "@/domain/gantt";
import { GroupForm } from "./GroupForm";

type Text = { add: string; task: string; group: string; groupText: Parameters<typeof GroupForm>[0]["text"] };

// One Add button: a task opens the task form, a group (managers only) opens the small group form in the same menu.
export function AddMenu({ projectId, groups, canManage, text }: { projectId: string; groups: GanttGroup[]; canManage: boolean; text: Text }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(false);
  const close = () => { setOpen(false); setForm(false); };
  return (
    <div className="gantt-add" onKeyDown={(e) => { if (e.key === "Escape") close(); }}>
      <button type="button" className="act act-primary" aria-haspopup="true" aria-expanded={open} onClick={() => (open ? close() : setOpen(true))}>＋ {text.add}</button>
      {open && (
        <div className="gantt-add-panel" role="group" aria-label={text.add}>
          {form ? <GroupForm projectId={projectId} groups={groups} text={text.groupText} onDone={close} /> : (
            <>
              <a href={`/app/gantt?project=${projectId}&create=task`}>{text.task}</a>
              {canManage && <button type="button" onClick={() => setForm(true)}>{text.group}</button>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
