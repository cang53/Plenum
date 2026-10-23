// Budget checks shared by the CI script and its test. Pure: takes numbers and text, returns failures.
export function checkBundle(stats, budget) {
  return stats
    .filter((r) => r.firstLoadUncompressedJsBytes > (budget.jsBytesByRoute[r.route] ?? budget.jsBytesDefault))
    .map((r) => `${r.route}: ${r.firstLoadUncompressedJsBytes} B of JS is over ${budget.jsBytesByRoute[r.route] ?? budget.jsBytesDefault} B`);
}

// Render cost of the glass UI: how big the blur is, how many surfaces blur, and how much CSS ships.
export function checkGlass(cssSources, builtCssBytes, budget) {
  const css = cssSources.join("\n");
  const fails = [];
  const rules = (css.match(/(?<!-webkit-)backdrop-filter\s*:/g) ?? []).length;
  if (rules > budget.maxBackdropRules) fails.push(`${rules} backdrop-filter rules is over ${budget.maxBackdropRules}`);
  for (const m of css.matchAll(/--glass-blur\s*:\s*(\d+)px/g)) {
    if (Number(m[1]) > budget.maxBlurPx) fails.push(`--glass-blur ${m[1]}px is over ${budget.maxBlurPx}px`);
  }
  if (builtCssBytes > budget.cssBytes) fails.push(`CSS is ${builtCssBytes} B, over ${budget.cssBytes} B`);
  return fails;
}
