/** Shared compact chat control styles — semantic colors, minimal chrome. */
export const chatBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none";

export const chatBtnEnd =
  `${chatBtn} border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200`;

export const chatBtnNext =
  `${chatBtn} border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200`;

export const chatBtnFun =
  `${chatBtn} border border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20`;

export const chatBtnLove =
  `${chatBtn} border border-pink-500/30 bg-pink-500/10 text-pink-200 hover:bg-pink-500/20`;

export const chatBtnNeutral =
  `${chatBtn} border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white`;

export const chatBtnNeutralOn =
  `${chatBtn} border border-white/15 bg-white/10 text-slate-200 hover:bg-white/15`;

export const chatBtnWarn =
  `${chatBtn} border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20`;

export const chatBtnReport =
  `${chatBtn} border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20`;

export const chatBtnBlock =
  `${chatBtn} border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20`;

export const chatBtnSend =
  `${chatBtn} border border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-100 hover:bg-fuchsia-500/25 px-4`;

export const chatBtnPrimarySolid =
  `${chatBtn} border border-violet-500/40 bg-violet-600/80 text-white hover:bg-violet-600`;

export const chatBtnGhost =
  `${chatBtn} border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5`;

export const chatToolbar =
  "flex flex-wrap items-center justify-center gap-2 w-full max-w-2xl";
