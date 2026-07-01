"use client";

type MfaCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
};

export function MfaCodeInput({
  value,
  onChange,
  disabled = false,
  id = "mfa-code",
}: MfaCodeInputProps) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      pattern="[0-9]*"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      placeholder="000000"
      className="w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-center text-lg tracking-[0.35em] font-mono text-white outline-none focus:border-fuchsia-500/50 placeholder:text-slate-600"
    />
  );
}
