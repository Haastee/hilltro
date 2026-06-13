import type { SelectOption } from "../components/SelectField";

// ISO 3166-1 alpha-2 codes (GB excluded — this list is the "outside the UK" picker).
const CODES = ("AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ "
  + "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR "
  + "GA GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG "
  + "KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU "
  + "MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW "
  + "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG "
  + "US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW").split(" ");

function flagFor(code: string): string {
  return code.replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

let cached: SelectOption[] | null = null;

// Searchable country options labelled "🇫🇷 France" etc., value = country name.
export function countryOptions(): SelectOption[] {
  if (cached) return cached;
  let display: Intl.DisplayNames | null = null;
  try { display = new Intl.DisplayNames(["en"], { type: "region" }); } catch { display = null; }
  cached = CODES
    .map((code) => {
      const name = (display && display.of(code)) || code;
      return { value: name, label: `${flagFor(code)} ${name}` };
    })
    .sort((a, b) => a.value.localeCompare(b.value));
  return cached;
}
