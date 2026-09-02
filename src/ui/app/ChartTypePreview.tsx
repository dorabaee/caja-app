import type { ChartType } from "@core/model/types";
import styles from "./ChartTypePreview.module.css";

/**
 * A small looping sketch of what each chart type looks like, drawn as inline SVG.
 *
 * Deliberately not real chart instances: six live recharts in a scrolling list would cost
 * far more than a decoration is worth, and these only have to convey the shape. Every
 * animation is CSS, so `prefers-reduced-motion` stills them all in one rule.
 */
export function ChartTypePreview({ type }: { type: ChartType }) {
  return (
    <span className={styles.wrap} aria-hidden>
      <svg viewBox="0 0 72 44" className={styles.svg} role="presentation">
        <line x1="6" y1="38" x2="68" y2="38" className={styles.axis} />
        {type === "bar" && <Bars />}
        {type === "stacked" && <Stacked />}
        {type === "line" && <Line />}
        {type === "area" && <Area />}
        {type === "combo" && <Combo />}
        {type === "pie" && <Pie />}
      </svg>
    </span>
  );
}

const BAR_X = [10, 24, 38, 52];

function Bars() {
  const heights = [14, 24, 10, 28];
  return (
    <>
      {BAR_X.map((x, i) => (
        <rect
          key={x}
          className={styles.grow}
          style={{ animationDelay: `${i * 120}ms` }}
          x={x}
          y={38 - heights[i]}
          width="10"
          height={heights[i]}
          rx="2"
          fill="var(--accent)"
        />
      ))}
    </>
  );
}

function Stacked() {
  // Each column is two segments; the lower one appears first, then the cap.
  const cols = [
    [10, 8],
    [16, 10],
    [7, 6],
    [18, 9],
  ];
  return (
    <>
      {BAR_X.map((x, i) => {
        const [base, cap] = cols[i];
        return (
          <g key={x}>
            <rect
              className={styles.grow}
              style={{ animationDelay: `${i * 110}ms` }}
              x={x}
              y={38 - base}
              width="10"
              height={base}
              rx="2"
              fill="var(--accent)"
            />
            <rect
              className={styles.grow}
              style={{ animationDelay: `${i * 110 + 220}ms` }}
              x={x}
              y={38 - base - cap}
              width="10"
              height={cap}
              rx="2"
              fill="var(--accent-weak-solid, var(--income))"
              opacity="0.75"
            />
          </g>
        );
      })}
    </>
  );
}

const LINE_POINTS = "8,30 22,18 36,24 50,10 64,16";

function Line() {
  return (
    <polyline
      className={styles.draw}
      points={LINE_POINTS}
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function Area() {
  return (
    <>
      <path
        className={styles.fill}
        d={`M8,38 L${LINE_POINTS.split(" ").join(" L")} L64,38 Z`}
        fill="var(--accent)"
        opacity="0.22"
      />
      <polyline
        className={styles.draw}
        points={LINE_POINTS}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function Combo() {
  const heights = [14, 22, 12, 26];
  return (
    <>
      {BAR_X.map((x, i) => (
        <rect
          key={x}
          className={styles.grow}
          style={{ animationDelay: `${i * 110}ms` }}
          x={x}
          y={38 - heights[i]}
          width="10"
          height={heights[i]}
          rx="2"
          fill="var(--accent)"
          opacity="0.45"
        />
      ))}
      <polyline
        className={styles.draw}
        style={{ animationDelay: "420ms" }}
        points="15,20 29,12 43,22 57,8"
        fill="none"
        stroke="var(--expense)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function Pie() {
  // Slices are drawn as dashed arcs on one circle: circumference ≈ 2πr with r = 13.
  const C = 2 * Math.PI * 13;
  const slices = [
    { frac: 0.45, color: "var(--accent)", offset: 0 },
    { frac: 0.3, color: "var(--income)", offset: 0.45 },
    { frac: 0.25, color: "var(--expense)", offset: 0.75 },
  ];
  return (
    <g transform="translate(36 21)">
      {slices.map((s, i) => (
        <circle
          key={i}
          className={styles.sweep}
          style={{
            animationDelay: `${i * 220}ms`,
            // Where this slice starts, as a rotation of the dash pattern.
            ["--dash" as string]: `${s.frac * C}px`,
            ["--gap" as string]: `${C}px`,
            ["--offset" as string]: `${-s.offset * C}px`,
          }}
          r="13"
          fill="none"
          stroke={s.color}
          strokeWidth="12"
          transform="rotate(-90)"
        />
      ))}
    </g>
  );
}
