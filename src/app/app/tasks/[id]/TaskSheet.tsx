import { getT } from "@/lib/locale";
import { SheetKeys } from "./SheetKeys";
import { TaskDetail } from "./TaskDetail";

// A task's detail beside the Board or Items; `closeHref` is the same page without the task.
export async function TaskSheet({ id, closeHref }: { id: string; closeHref: string }) {
  const t = await getT();
  return (
    <aside className="sheet" aria-label={t("taskDetail.sheet")}>
      <SheetKeys closeHref={closeHref} />
      <TaskDetail id={id} closeHref={closeHref} />
    </aside>
  );
}
