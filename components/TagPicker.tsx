"use client";

type TagPickerProps = {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
};

export function TagPicker({
  label,
  options,
  selected,
  onChange,
  max = 8,
}: TagPickerProps) {
  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, tag]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm text-purple-300/80 font-medium">{label}</label>
        <span className="text-[10px] text-slate-500">
          {selected.length}/{max}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
                active
                  ? "bg-fuchsia-500/20 border-fuchsia-400 text-fuchsia-200"
                  : "bg-slate-900 border-purple-500/20 text-slate-400 hover:border-purple-400/40"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
