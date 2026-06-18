import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import styles from "./Field.module.css";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(styles.input, className)} {...rest} />;
  },
);

export interface FieldProps {
  label: string;
  hint?: ReactNode;
  children: (props: { id: string }) => ReactNode;
}

/** Label-above-field wrapper. Pass a render fn so the control gets the generated id. */
export function Field({ label, hint, children }: FieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {children({ id })}
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
