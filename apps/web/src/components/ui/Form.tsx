import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Search } from 'lucide-react';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className = '',
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`os-field ${className}`}>
      <label className="os-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <span className="os-hint" style={{ color: 'var(--bad)' }}>{error}</span> : hint ? <span className="os-hint">{hint}</span> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className = '', ...rest },
  ref,
) {
  return <input ref={ref} className={`os-input ${className}`} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className = '', children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={`os-select ${className}`} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className = '', ...rest },
  ref,
) {
  return <textarea ref={ref} className={`os-textarea ${className}`} {...rest} />;
});

export const SearchBar = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { shortcut?: string; wrapperClassName?: string }
>(function SearchBar({ shortcut, wrapperClassName = '', className = '', ...rest }, ref) {
  return (
    <div className={`os-search ${wrapperClassName}`}>
      <Search />
      <input ref={ref} type="search" className={`os-input ${className}`} {...rest} />
      {shortcut && <kbd className="hidden md:inline-flex">{shortcut}</kbd>}
    </div>
  );
});

export function Checkbox({
  label,
  checked,
  onChange,
  id,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <label className="os-check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
