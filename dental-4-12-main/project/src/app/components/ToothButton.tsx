import { conditionColors, type ChartEntry } from '../utils/dentalChartCodes';

// One tooth on the odontogram.
//
// Extracted from `DentalChart.tsx` in Sprint 162 (TAB 2), unchanged in what it
// renders. ⚠ It used to be declared INSIDE the host component, which made it a
// new component type on every render, so React unmounted and remounted all 52
// teeth on every keystroke anywhere on the screen. At module scope the teeth
// are reconciled instead. Nothing visible changes; the remount just stops.
//
// It knows nothing about the palette. `armed` says whether a click would do
// something (a code is selected), and `onClick` says what that is. The host
// owns what a click MEANS (handleToothClick), because the host owns the draft.
export function ToothButton({
  num,
  entry,
  clickable,
  armed,
  onClick,
}: {
  num: number;
  entry: ChartEntry | undefined;
  /** Edit mode is on for a dentist. Off, the tooth is inert. */
  clickable: boolean;
  /** Clickable AND a condition or treatment is selected: the hover shows it. */
  armed: boolean;
  onClick: (num: number) => void;
}) {
  const cond = entry?.condition || '';
  const treat = entry?.treatment || '';
  const colorClass = conditionColors[cond] || conditionColors[cond.toLowerCase()] || 'bg-card border-border';
  const hoverClass = armed
    ? 'hover:border-teal-500 hover:ring-2 hover:ring-teal-300 hover:bg-teal-50 cursor-pointer'
    : 'cursor-default';
  return (
    <button
      onClick={() => clickable && onClick(num)}
      // Grows to fill the card instead of leaving ~100px of slack on each
      // side, capped so the boxes stay tooth-shaped rather than becoming wide
      // rectangles on a large screen. flex-1 is also what keeps the primary
      // row aligned with the permanent one -- both rows are 16 equal slots.
      className={`relative flex h-[52px] min-w-[40px] max-w-[56px] flex-1 flex-col items-center justify-between rounded-md border-2 px-0.5 py-1 text-center transition-all md:h-[64px] ${colorClass} ${hoverClass}`}
    >
      <div className="text-[8px] font-medium text-slate-500 leading-none">{num}</div>
      {cond && <div className="text-[11px] md:text-sm font-bold text-slate-700 leading-none">{cond}</div>}
      {/* Blue, not teal: the palette selects conditions in teal and
          treatments in blue, but this rendered the treatment code in the
          condition colour, crossing the two vocabularies on the teeth. */}
      {treat && <div className="text-[8px] md:text-[10px] font-semibold text-blue-700 leading-none">{treat}</div>}
    </button>
  );
}
