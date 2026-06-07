import phoneMetadata from "./generated/libphonenumber-metadata.min.json";

type PhoneMetadata = {
  country_calling_codes: Record<string, string[]>;
};

export type CountryDialOption = {
  countryCode: string;
  dialCode: string;
  flag: string;
  name: string;
  label: string;
  search: string;
};

const displayNames = typeof Intl !== "undefined" && "DisplayNames" in Intl
  ? new Intl.DisplayNames(["en"], { type: "region" })
  : null;

function flagEmoji(countryCode: string) {
  return countryCode
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export const countryDialOptions: CountryDialOption[] = Object.entries((phoneMetadata as PhoneMetadata).country_calling_codes)
  .flatMap(([dialCode, countries]) => countries.map((countryCode) => {
    const name = displayNames?.of(countryCode) || countryCode;
    const label = `${flagEmoji(countryCode)} ${name} (+${dialCode})`;
    return {
      countryCode,
      dialCode: `+${dialCode}`,
      flag: flagEmoji(countryCode),
      name,
      label,
      search: `${countryCode} ${name} +${dialCode}`.toLowerCase()
    };
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const defaultCountryDialOption = countryDialOptions.find((country) => country.countryCode === "GB") || countryDialOptions[0];
