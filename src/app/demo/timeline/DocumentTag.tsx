"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logError } from "@/lib/log";
import { DOC_TYPES, type TimelineAttachment } from "@/domain/timeline";
import { t as translate, type Locale } from "@/lib/messages";

export type TagAttachment = (id: string, docType: string, docRef: string, revision: string) => Promise<void>;

// Type, number and revision chips for an attachment; a manager also gets a small form to set them.
export function DocumentTag({ attachment: a, onTag, language }: { attachment: TimelineAttachment; onTag?: TagAttachment; language: Locale }) {
  const t = (key: Parameters<typeof translate>[0]) => translate(key, language);
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const save = async (form: FormData) => {
    try {
      await onTag?.(a.id, String(form.get("type")), String(form.get("ref")), String(form.get("revision")));
      setFailed(false);
      router.refresh();
    } catch (error) {
      logError("tagging failed", error);
      setFailed(true);
    }
  };
  return (
    <>
      {a.docType && <span className="chip">{t(`doc.type.${a.docType}`)}</span>}
      {a.docRef && <span className="meta"> {a.docRef}{a.revision ? ` ${t("doc.revision").replace("{revision}", a.revision)}` : ""}</span>}
      {a.docRef && <span className={a.superseded ? "badge badge-warning" : "badge badge-success"}> {a.superseded ? t("doc.superseded") : t("doc.latest")}</span>}
      {onTag && (
        <details>
          <summary>{t("doc.tag")}</summary>
          <form action={save}>
            <label>{t("doc.type")}{" "}
              <select name="type" defaultValue={a.docType ?? ""}>
                <option value="" />
                {DOC_TYPES.map((d) => <option key={d} value={d}>{t(`doc.type.${d}`)}</option>)}
              </select>
            </label>{" "}
            <label>{t("doc.ref")} <input name="ref" defaultValue={a.docRef ?? ""} maxLength={60} /></label>{" "}
            <label>{t("doc.revisionLabel")} <input name="revision" defaultValue={a.revision ?? ""} maxLength={20} /></label>{" "}
            <button type="submit">{t("doc.save")}</button>
            {failed && <p role="alert">{t("doc.saveError")}</p>}
          </form>
        </details>
      )}
    </>
  );
}
