import { createContext, useContext, type ReactElement, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Popover } from "./Popover";
import { cn } from "./cn";
import styles from "./Menu.module.css";

const MenuContext = createContext<{ close: () => void }>({ close: () => {} });

export interface MenuProps {
  /** A button-like element; cloned with ref + click handler + aria. */
  trigger: ReactElement;
  align?: "start" | "end";
  minWidth?: number;
  className?: string;
  children: ReactNode;
}

export function Menu({ trigger, align = "start", minWidth = 184, className, children }: MenuProps) {
  return (
    <Popover trigger={trigger} align={align} minWidth={minWidth} role="menu" className={cn(styles.menu, className)}>
      {({ close }) => <MenuContext.Provider value={{ close }}>{children}</MenuContext.Provider>}
    </Popover>
  );
}

export interface MenuItemProps {
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  /** Optional sibling action (never nested inside the menu-item button). */
  trailingAction?: ReactNode;
}

export function MenuItem({ icon, children, onClick, danger, disabled, checked, trailingAction }: MenuItemProps) {
  const { close } = useContext(MenuContext);
  const button = (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      className={cn(styles.item, danger && styles.danger)}
      onClick={() => {
        onClick?.();
        close();
      }}
    >
      {icon && <span className={styles.itemIcon}>{icon}</span>}
      <span className={styles.itemLabel}>{children}</span>
      {checked && <Check className={styles.check} size={15} aria-hidden />}
    </button>
  );
  return trailingAction ? (
    <div className={styles.itemGroup} role="none">
      {button}
      <span className={styles.trailing}>{trailingAction}</span>
    </div>
  ) : button;
}

export function MenuSeparator() {
  return <div className={styles.sep} role="separator" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <div className={styles.menuLabel}>{children}</div>;
}
