"use client";

import {
  GENDER_IDENTITIES,
  MEET_PREFERENCE_OPTIONS,
  encodeMeetPreference,
  meetPreferenceFromLookingFor,
  type GenderIdentity,
  type LookingFor,
  type MeetPreference,
} from "@/lib/profile-orientation";

type Props = {
  genderIdentity: GenderIdentity | "";
  lookingFor: LookingFor | "";
  onGenderIdentityChange: (value: GenderIdentity) => void;
  onLookingForChange: (value: LookingFor) => void;
  idPrefix?: string;
};

const SIMPLE_OPTIONS = MEET_PREFERENCE_OPTIONS.filter((o) => o.group === "simple");
const MORE_OPTIONS = MEET_PREFERENCE_OPTIONS.filter((o) => o.group === "more");

export function ProfileOrientationFields({
  genderIdentity,
  lookingFor,
  onGenderIdentityChange,
  onLookingForChange,
  idPrefix = "profile",
}: Props) {
  const selectClass =
    "select-dark w-full rounded-xl bg-slate-900 border border-purple-500/20 px-4 py-3 text-sm text-slate-100 outline-none focus:border-fuchsia-500/50";

  const meetPreference = meetPreferenceFromLookingFor(
    lookingFor || undefined
  );

  function handleGenderChange(value: GenderIdentity) {
    onGenderIdentityChange(value);
    if (!meetPreference) return;
    onLookingForChange(encodeMeetPreference(meetPreference, value));
  }

  function handleMeetPreferenceChange(value: MeetPreference) {
    if (!genderIdentity) return;
    onLookingForChange(encodeMeetPreference(value, genderIdentity));
  }

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
            handleGenderChange(e.target.value as GenderIdentity)
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
          value={meetPreference}
          onChange={(e) =>
            handleMeetPreferenceChange(e.target.value as MeetPreference)
          }
          className={selectClass}
          required
          disabled={!genderIdentity}
        >
          <option value="" disabled>
            {genderIdentity ? "Select…" : "Choose how you identify first"}
          </option>
          {SIMPLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          <option disabled aria-hidden>
            ────────────
          </option>
          {MORE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Used for matching only. Default is{" "}
          <strong className="text-slate-400">Anyone</strong> — change to Men or
          Women if you prefer. Example: if you&apos;re a woman interested in
          men, choose <strong className="text-slate-400">Men</strong>.
        </p>
      </div>
    </>
  );
}
