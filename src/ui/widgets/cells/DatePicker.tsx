import { useMemo, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, es } from "date-fns/locale";
import { parseDateCell } from "@core/format/date";
import { useStore } from "@core/store";
import { Popover, cn } from "@ui/common";
import styles from "../widget.module.css";

/** The value format a date cell stores — what the old native input emitted, so nothing
 *  downstream (exports, PDF, nextDateCell) has to change. */
const CELL_FORMAT = "yyyy-MM-dd";

/**
 * The app's own calendar, replacing the browser's built-in one: that popup can't be
 * styled at all, so it ignored the theme entirely and its own calendar glyph collided
 * with the cell's note button. This one is themed, localised, and sits beside the note
 * button rather than under it.
 */
export function DatePicker({
  value,
  onChange,
  className,
  trigger,
  initialDate,
}: {
  /** The cell's raw stored value (any format `parseDateCell` understands). */
  value: string;
  onChange: (value: string) => void;
  className?: string;
  trigger?: ReactElement;
  /** The month to open when no date is selected (quick-add uses the viewed month). */
  initialDate?: Date;
}) {
  const { t } = useTranslation();
  const locale = useStore((s) => s.doc.settings.locale);
  const dfns = locale === "es" ? es : enUS;
  const selected = parseDateCell(value);
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(selected ?? initialDate ?? new Date()));

  // Six fixed weeks so the grid never changes height as you page through months.
  const days = useMemo(() => {
    const first = startOfWeek(startOfMonth(cursor), { locale: dfns });
    return Array.from({ length: 42 }, (_, i) => addDays(first, i));
  }, [cursor, dfns]);

  const weekdays = useMemo(
    () => days.slice(0, 7).map((d) => format(d, "EEEEE", { locale: dfns })),
    [days, dfns],
  );

  return (
    <Popover
      align="end"
      minWidth={260}
      className={styles.calPop}
      onOpenChange={(open) => {
        // Reopening always lands on the selected date's month, not wherever you paged to.
        if (open) setCursor(startOfMonth(parseDateCell(value) ?? initialDate ?? new Date()));
      }}
      trigger={trigger ?? (
        <button
          type="button"
          className={cn(styles.cellBtn, className)}
          aria-label={t("widgets.pickDate")}
          title={t("widgets.pickDate")}
        >
          <CalendarDays size={13} aria-hidden />
        </button>
      )}
    >
      {({ close }) => (
        <div className={styles.calPanel}>
          <div className={styles.calHead}>
            <button
              type="button"
              className={styles.calNav}
              aria-label={t("widgets.prevMonth")}
              onClick={() => setCursor((c) => addMonths(c, -1))}
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <span className={styles.calMonth}>
              {format(cursor, "MMMM yyyy", { locale: dfns })}
            </span>
            <button
              type="button"
              className={styles.calNav}
              aria-label={t("widgets.nextMonth")}
              onClick={() => setCursor((c) => addMonths(c, 1))}
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>

          <div className={styles.calWeekdays} aria-hidden>
            {weekdays.map((w, i) => (
              <span key={i} className={styles.calWeekday}>
                {w}
              </span>
            ))}
          </div>

          <div className={styles.calGrid} role="grid">
            {days.map((day) => {
              const isSelected = !!selected && isSameDay(day, selected);
              return (
                <button
                  key={day.getTime()}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  className={cn(
                    styles.calDay,
                    !isSameMonth(day, cursor) && styles.calDayOutside,
                    isToday(day) && styles.calDayToday,
                    isSelected && styles.calDaySelected,
                  )}
                  onClick={() => {
                    onChange(format(day, CELL_FORMAT));
                    close();
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className={styles.calFoot}>
            <button
              type="button"
              className={styles.calClear}
              onClick={() => {
                onChange("");
                close();
              }}
            >
              {t("widgets.clearNote")}
            </button>
            <button
              type="button"
              className={styles.calToday}
              onClick={() => {
                onChange(format(new Date(), CELL_FORMAT));
                close();
              }}
            >
              {t("widgets.today")}
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}
