"use client";

import { useActionState } from "react";
import type { Skipped } from "@/domain/planImport";
import { applyPlan, previewPlan, type ImportState } from "./actions";

type Labels = Record<"file" | "preview" | "apply" | "created" | "refreshed" | "unchanged" | "done" | "links" | "skipped", string>;

// Preview first, then apply: the second step re-sends the previewed rows, which the server checks again.
export function ImportForm({ projectId, labels, errors, skips }: { projectId: string; labels: Labels; errors: Record<string, string>; skips?: Record<Skipped["reason"], string> }) {
  const [previewed, preview] = useActionState<ImportState, FormData>(previewPlan, {});
  const [applied, apply] = useActionState<ImportState, FormData>(applyPlan, {});
  const error = applied.error ?? previewed.error;
  const counts = applied.counts ?? previewed.counts;
  return (
    <>
      {error && <p role="alert">{errors[error] ?? error}</p>}
      {applied.done && <p role="status">{labels.done}</p>}
      <form action={preview}>
        <input type="hidden" name="projectId" value={projectId} />
        <p><label>{labels.file} <input className="field" type="file" name="plan" accept=".xml,.xer" required /></label></p>
        <button type="submit" className="btn btn-secondary">{labels.preview}</button>
      </form>
      {counts && (
        <ul>
          <li>{labels.created}: {counts.create}</li>
          <li>{labels.refreshed}: {counts.refresh}</li>
          <li>{labels.unchanged}: {counts.unchanged}</li>
          {previewed.links && <li>{labels.links}: {previewed.links.length}</li>}
        </ul>
      )}
      {!!previewed.skipped?.length && skips && (
        <>
          <p>{labels.skipped}: {previewed.skipped.length}</p>
          <ul>{previewed.skipped.map((s, i) => <li key={i}>{skips[s.reason].replace("{from}", s.from).replace("{to}", s.to)}</li>)}</ul>
        </>
      )}
      {previewed.rows && !applied.done && (
        <form action={apply}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="rows" value={JSON.stringify(previewed.rows)} />
          <input type="hidden" name="links" value={JSON.stringify(previewed.links ?? [])} />
          <button type="submit" className="btn btn-primary">{labels.apply}</button>
        </form>
      )}
    </>
  );
}
