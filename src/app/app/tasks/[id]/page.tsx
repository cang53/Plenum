import { TaskDetail } from "./TaskDetail";

export const dynamic = "force-dynamic";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  return <main id="main" className="page task-detail"><TaskDetail id={(await params).id} /></main>;
}
