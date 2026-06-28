"use client";

import { useId, useState } from "react";
import { validateUsername, USERNAME_HINT } from "@/lib/username";

type Props = {
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  id?: string;
  showHint?: boolean;
  /** Validate while typing (default true after first blur). */
  validateLive?: boolean;
};

export function UsernameInput({
  value,
  onChange,
  inputClassName = "",
  placeholder = "Username",
  required = false,
  disabled = false,
  readOnly = false,
  id: idProp,
  showHint = true,
  validateLive = true,
}: Props) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;
  const [touched, setTouched] = useState(false);

  const result = validateUsername(value);
  const showError =
    (touched || (validateLive && value.length > 0)) && !result.valid;

  return (
    <div>
      <input
        id={id}
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={15}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        className={inputClassName}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={showError}
        aria-describedby={showError ? errorId : undefined}
      />
      {showError && result.error && (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 text-sm text-red-400"
        >
          {result.error}
        </p>
      )}
      {showHint && !showError && (
        <p className="mt-1.5 text-xs text-slate-500">{USERNAME_HINT}</p>
      )}
    </div>
  );
}
