import { answerLink } from "./actions";
import type { MessageKey } from "@/lib/messages";

// Asks whether a risk is about the suggested activity: yes, no, or another one.
export function LinkAsk({ t, riskId, guess, tasks }: { t: (k: MessageKey) => string; riskId: string; guess: { id: string; title: string }; tasks: { id: string; title: string }[] }) {
  const id = <input type="hidden" name="id" value={riskId} />;
  return (
    <section className="surface rk-ask" aria-label={t("risks.linkedTask")}>
      <p>{t("risks.linkAsk").replace("{title}", guess.title)}</p>
      <div className="rk-ask-btns">
        <form action={answerLink}>{id}<input type="hidden" name="linkedTaskId" value={guess.id} /><button type="submit" className="btn btn-primary">{t("risks.linkYes")}</button></form>
        <form action={answerLink}>{id}<button type="submit" className="btn btn-secondary">{t("risks.linkNo")}</button></form>
        <form action={answerLink} className="rk-ask-other">{id}<select name="linkedTaskId" className="rk-in" aria-label={t("risks.linkOther")} required defaultValue=""><option value="" disabled>{t("risks.linkOther")}</option>{tasks.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select><button type="submit" className="btn btn-secondary">{t("risks.linkSave")}</button></form>
      </div>
    </section>
  );
}
