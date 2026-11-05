"use client";

import { useState } from "react";
import type { GanttGroup } from "@/domain/gantt";
import { GroupForm } from "@/app/app/gantt/GroupForm";
import { Pop } from "./Pop";

type Text = { add: string; task: string; group: string; groupText: Parameters<typeof GroupForm>[0]["text"] };

// The one Add button for Plan, List and Board: a menu with Task and, for managers, Group (its small form opens in the menu).
export function AddMenu({ projectId, groups, canManage, text, taskHref }: { projectId: string; groups: GanttGroup[]; canManage: boolean; text: Text; taskHref: string }) {
  const [form, setForm] = useState(false);
  const plus = <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
  if (!canManage) return <a className="add-btn" href={taskHref}>{plus}{text.add}</a>;
  return (
    <Pop label={text.add} role="menu" align="end" className="add-menu" onClose={() => setForm(false)} trigger={<>{plus}<span>{text.add}</span></>}>
      {(close) => form ? <GroupForm projectId={projectId} groups={groups} text={text.groupText} onDone={close} /> : (
        <>
          <a role="menuitem" href={taskHref}>{text.task}</a>
          <button type="button" role="menuitem" onClick={() => setForm(true)}>{text.group}</button>
        </>
      )}
    </Pop>
  );
}
