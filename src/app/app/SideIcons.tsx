// Sidebar icons, the paths exported from the design file. Each viewBox is the icon's own 22px (or 20px) box, so 1.7 strokes stay 1.7px.
const st = { strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ink = { ...st, stroke: "currentColor" } as const;
const detail = { ...st, stroke: "var(--side-detail)", fill: "none" } as const;
const svg = (box: string, size: number, kids: React.ReactNode) => <svg width={size} height={size} viewBox={box} fill="none" aria-hidden="true">{kids}</svg>;

type Name = "back" | "forward" | "find" | "home" | "search" | "bag" | "play" | "gear" | "plus" | "hash" | "chevrons" | "collapse" | "add" | "plusdot" | "pin";
// Decorative: the link or button next to it carries the name.
export function SideIcon({ name, size = 22 }: { name: Name; size?: number }) {
  switch (name) {
    case "back": return svg("375 98 19 19", size, <path d="M386.875 100.167L380.542 106.5L386.875 112.833" {...st} stroke="currentColor" />);
    case "forward": return svg("414 98 21 21", size, <path d="M417.5 107.5H431.5M425.375 113.625L431.5 107.5L425.375 101.375" {...st} stroke="currentColor" />);
    case "find": return svg("1551 154 19 19", size, <><path d="M1565.25 161.313C1565.25 164.592 1562.59 167.25 1559.31 167.25C1556.03 167.25 1553.38 164.592 1553.38 161.313C1553.38 158.033 1556.03 155.375 1559.31 155.375C1562.59 155.375 1565.25 158.033 1565.25 161.313Z" {...st} stroke="currentColor" /><path d="M1563.67 165.667L1567.63 169.625" {...st} stroke="currentColor" /></>);
    case "home": return svg("38 151 22 22", size, <><path d="M40.75 160.167L49 153.75L57.25 160.167V170.25H40.75V160.167Z" fill="currentColor" {...ink} /><path d="M45.3333 163.833C47.7777 166.889 50.2221 166.889 52.6666 163.833" {...detail} /></>);
    case "search": return svg("38 197 22 22", size, <><path d="M54.5 206.625C54.5 210.422 51.422 213.5 47.625 213.5C43.828 213.5 40.75 210.422 40.75 206.625C40.75 202.828 43.828 199.75 47.625 199.75C51.422 199.75 54.5 202.828 54.5 206.625Z" {...ink} /><path d="M52.6667 211.667L57.2501 216.25" {...ink} /></>);
    case "bag": return svg("38 254 22 22", size, <><path d="M53.5834 258.583H44.4167C42.898 258.583 41.6667 259.815 41.6667 261.333V272.333C41.6667 273.852 42.898 275.083 44.4167 275.083H53.5834C55.1022 275.083 56.3334 273.852 56.3334 272.333V261.333C56.3334 259.815 55.1022 258.583 53.5834 258.583Z" fill="currentColor" {...ink} /><path d="M45.3333 258.583V255.833H52.6666V258.583" {...ink} /></>);
    case "play": return svg("38 301 22 22", size, <><path d="M55.4167 302.833H42.5833C41.5708 302.833 40.75 303.654 40.75 304.667V320.25C40.75 321.263 41.5708 322.083 42.5833 322.083H55.4167C56.4292 322.083 57.25 321.263 57.25 320.25V304.667C57.25 303.654 56.4292 302.833 55.4167 302.833Z" fill="currentColor" {...ink} /><path d="M47.1667 308.333L52.6667 312L47.1667 315.667V308.333Z" fill="var(--side-detail)" /></>);
    case "gear": return svg("38 1020 22 22", size, <><path d="M46.2501 1021.83H51.7501L52.6667 1025.5L56.3334 1026.42L58.1667 1031L55.4167 1033.75V1037.42L50.8334 1040.17L48.0834 1037.42H44.4167L41.6667 1032.83L44.4167 1030.08V1026.42L46.2501 1021.83Z" fill="currentColor" {...ink} /><path d="M51.75 1031C51.75 1032.52 50.5188 1033.75 49 1033.75C47.4812 1033.75 46.25 1032.52 46.25 1031C46.25 1029.48 47.4812 1028.25 49 1028.25C50.5188 1028.25 51.75 1029.48 51.75 1031Z" {...detail} /></>);
    case "plus": return svg("38 699 22 22", size, <path d="M49.0001 702.667V717.333M41.6667 710H56.3334" {...st} stroke="currentColor" />);
    case "add": return svg("38 699 22 22", size, <path d="M49.0001 702.667V717.333M41.6667 710H56.3334" {...st} stroke="currentColor" />);
    case "hash": return svg("73 514 20 20", size, <path d="M80.5001 516.5L78.0001 531.5M87.1667 516.5L84.6667 531.5M75.5001 521.5H90.5001M74.6667 527.333H89.6667" {...ink} />);
    case "chevrons": return svg("216 94 20 24", size, <><path d="M222.568 101.773L221.705 100.909L226.364 96.25L231.023 100.909L230.159 101.773L226.364 97.9886L222.568 101.773Z" fill="currentColor" /><path d="M223.936 116.504L220.816 110.488H222.112L224.096 114.424L226.08 110.488H227.376L224.256 116.504H223.936Z" fill="currentColor" /></>);
    case "collapse": return svg("308 97 18 21", size, <><path d="M315.625 101.833L309.958 107.5L315.625 113.167" {...ink} /><path d="M323.625 101.833L317.958 107.5L323.625 113.167" {...ink} /></>);
    case "pin": return svg("1353 151 22 22", size, <path d="M1365.42 152.917L1373.08 160.583L1368.29 161.542L1363.5 168.25L1360.62 165.375L1354.88 172.083L1359.67 164.417L1356.79 161.542L1363.5 156.75L1365.42 152.917Z" fill="currentColor" {...ink} />);
    case "plusdot": return svg("305 366 16 16", size, <path d="M311.992 377.354V370.632H313.33V377.354H311.992ZM309.303 374.659V373.322H316.024V374.659H309.303Z" fill="currentColor" />);
  }
}
