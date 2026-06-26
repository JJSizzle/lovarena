"use client";

import {
  GENDER_IDENTITIES,
  LOOKING_FOR_OPTIONS,
  type GenderIdentity,
  type LookingFor,
} from "@/lib/profile-orientation";

type Props = {
  genderIdentity: GenderIdentity | "";
  lookingFor: LookingFor | "";
  onGenderIdentityChange: (value: GenderIdentity) => void;
  onLookingForChange: (value: LookingFor) => void;
  idPrefix?: string;
};

export function ProfileOrientationFields({
  genderIdentity,
  lookingFor,
  onGenderIdentityChange,
  onLookingForChange,
  idPrefix = "profile",
}: Props) {
  return (
    <>
      <div>
        <label
          htmlFor={`${idPrefix}-gender`}
          className="block text-sm text-slate-400 mb-2"
        >
          I identify as
        </label>
        <select
          id={`${idPrefix}-gender`}
          value={genderIdentity}
          onChange={(e) =>
            onGenderIdentityChange(e.target.value as GenderIdentity)
          }
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-sky-500/50 text-white"
          required
        >
          <option value="" disabled>
            Select…
          </option>
          {GENDER_IDENTITIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-looking-for`}
          className="block text-sm text-slate-400 mb-2"
        >
          I want to meet
        </label>
        <select
          id={`${idPrefix}-looking-for`}
          value={lookingFor}
          onChange={(e) => onLookingForChange(e.target.value as LookingFor)}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm outline-none focus:border-sky-500/50 text-white"
          required
        >
          <option value="" disabled>
            Select…
          </option>
          {LOOKING_FOR_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
