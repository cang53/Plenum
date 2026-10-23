import { ITEM_KINDS } from "@/domain/linking";
import type { Filters } from "@/domain/filters";
import type { MessageKey } from "@/lib/messages";


// Plain GET fields, so the chosen filters end up in the page address.
export function FilterFields({ t, values, tasks, withSender }: { t: (key: MessageKey) => string; values: Filters; tasks?: { id: string; title: string }[]; withSender?: boolean }) {
  return (
    <>
      <label>{t("filter.from")} <input type="date" name="from" defaultValue={values.from} /></label>{" "}
      <label>{t("filter.to")} <input type="date" name="to" defaultValue={values.to} /></label>{" "}
      {withSender && <label>{t("filter.sender")} <input type="text" name="sender" defaultValue={values.sender} maxLength={200} /></label>}{" "}
      {withSender && (
        <label>{t("filter.kind")}{" "}
          <select name="kind" defaultValue={values.kind ?? ""}>
            <option value="">{t("filter.anyKind")}</option>
            {ITEM_KINDS.map((k) => <option key={k} value={k}>{t(`kind.${k}`)}</option>)}
          </select>
        </label>
      )}
      {tasks && (
        <label>{t("filter.task")}{" "}
          <select name="task" defaultValue={values.task ?? ""}>
            <option value="">{t("filter.anyTask")}</option>
            {tasks.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
          </select>
        </label>
      )}{" "}
    </>
  );
}
