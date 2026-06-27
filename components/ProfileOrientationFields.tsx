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
  const selectClass =
    "select-dark w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500/50";

  return (
    <>
      <div>
        <label
          htmlFor={`${idPrefix}-gender`}
          className="block text-sm text-purple-300/80 mb-2"
        >
          I identify as
        </label>
        <select
          id={`${idPrefix}-gender`}
          value={genderIdentity}
          onChange={(e) =>
            onGenderIdentityChange(e.target.value as GenderIdentity)
          }
          className={selectClass}
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
          className="block text-sm text-purple-300/80 mb-2"
        >
          I want to meet
        </label>
        <select
          id={`${idPrefix}-looking-for`}
          value={lookingFor}
          onChange={(e) => onLookingForChange(e.target.value as LookingFor)}
          className={selectClass}
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
