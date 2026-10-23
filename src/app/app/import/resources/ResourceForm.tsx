"use client";

import { useActionState } from "react";
import { applyResources, previewResources, type ResourceState } from "./actions";

type Labels = Record<"file" | "preview" | "apply" | "assign" | "unchanged" | "skipped" | "unmatched" | "skip" | "done", string>;
type Person = { userId: string; name: string };

// Preview first. People the file names but we cannot match by email get a pick list; the choice is yours.
export function ResourceForm({ projectId, people, labels, errors }: { projectId: string; people: Person[]; labels: Labels; errors: Record<string, string> }) {
  const [previewed, preview] = useActionState<ResourceState, FormData>(previewResources, {});
  const [applied, apply] = useActionState<ResourceState, FormData>(applyResources, {});
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
          <li>{labels.assign}: {counts.assign}</li>
          <li>{labels.unchanged}: {counts.unchanged}</li>
          <li>{labels.skipped}: {counts.skipped}</li>
        </ul>
      )}
      {previewed.data && !applied.done && (
        <form action={apply}>
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="data" value={JSON.stringify(previewed.data)} />
          {!!previewed.unmatched?.length && <p>{labels.unmatched}</p>}
          {previewed.unmatched?.map((r) => (
            <p key={r.id}>
              <label>{r.name}{" "}
                <select className="field" name={`pick:${r.id}`} defaultValue="">
                  <option value="">{labels.skip}</option>
                  {people.map((p) => <option key={p.userId} value={p.userId}>{p.name}</option>)}
                </select>
              </label>
            </p>
          ))}
          <button type="submit" className="btn btn-primary">{labels.apply}</button>
        </form>
      )}
    </>
  );
}
