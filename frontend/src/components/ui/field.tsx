/**
 * Form field primitives — labels always visible above inputs, errors linked
 * via aria-describedby, error icon + text (never color alone). Spec §10.1/§12.
 */
import { AlertCircle } from "lucide-react";
import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/utils";

interface FieldWrapperProps {
  label: string;
  error?: string;
  help?: string;
  required?: boolean;
  children: (ids: { inputId: string; describedBy?: string }) => React.ReactNode;
}

export function FieldWrapper({ label, error, help, required, children }: FieldWrapperProps) {
  const inputId = useId();
  const msgId = useId();
  const describedBy = error || help ? msgId : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
        {required && <span aria-hidden className="text-danger-700"> *</span>}
      </label>
      {children({ inputId, describedBy })}
      {error ? (
        <p id={msgId} role="alert" className="flex items-center gap-1 text-sm text-danger-700 dark:text-danger-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden /> {error}
        </p>
      ) : help ? (
        <p id={msgId} className="text-sm text-text-secondary">{help}</p>
      ) : null}
    </div>
  );
}

const inputClasses =
  "h-10 w-full rounded-sm border border-border-default bg-surface px-3 text-sm " +
  "placeholder:text-text-secondary/70 focus-visible:border-primary-500 " +
  "aria-[invalid=true]:border-danger-700 disabled:opacity-50";

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  help?: string;
}

/** Text input with integrated label + error/help messaging. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, help, required, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} help={help} required={required}>
      {({ inputId, describedBy }) => (
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(inputClasses, className)}
          {...props}
        />
      )}
    </FieldWrapper>
  ),
);
TextField.displayName = "TextField";

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  help?: string;
}

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, help, required, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} help={help} required={required}>
      {({ inputId, describedBy }) => (
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(inputClasses, "h-auto min-h-24 py-2", className)}
          {...props}
        />
      )}
    </FieldWrapper>
  ),
);
TextAreaField.displayName = "TextAreaField";

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  help?: string;
}

/** Select input with the same label/error/focus treatment as TextField. */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, help, required, className, children, ...props }, ref) => (
    <FieldWrapper label={label} error={error} help={help} required={required}>
      {({ inputId, describedBy }) => (
        <select
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy}
          required={required}
          className={cn(inputClasses, className)}
          {...props}
        >
          {children}
        </select>
      )}
    </FieldWrapper>
  ),
);
SelectField.displayName = "SelectField";
