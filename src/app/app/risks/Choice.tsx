// A row of buttons that act as one choice (radio inputs underneath), used instead of dropdowns for short lists.
export function Choice({ name, label, options, value, form }: { name: string; label: string; options: { value: string; label: string }[]; value: string; form?: string }) {
  return (
    <fieldset className="rk-choice">
      <legend className="rk-lab">{label}</legend>
      <div className="rk-pills">
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} defaultChecked={o.value === value} form={form} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
