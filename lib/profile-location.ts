import { getCountryName } from "@/lib/countries";
import { countryCodeToFlag } from "@/lib/flags";
import { getUsStateName, isValidUsStateCode } from "@/lib/us-states";

export function formatProfileLocation(
  countryCode: string | null | undefined,
  stateCode: string | null | undefined
): string | null {
  const country = getCountryName(countryCode);
  if (!country) return null;

  const flag = countryCodeToFlag(countryCode);
  const stateName =
    countryCode?.toUpperCase() === "US" ? getUsStateName(stateCode) : null;

  if (stateName) return `${flag} ${stateName}, United States`;
  return `${flag} ${country}`;
}

export function normalizeProfileStateCode(
  countryCode: string | null | undefined,
  stateCode: string | null | undefined
): string | null {
  if (!countryCode || countryCode.toUpperCase() !== "US") return null;
  if (!stateCode || !isValidUsStateCode(stateCode)) return null;
  return stateCode.toUpperCase();
}
