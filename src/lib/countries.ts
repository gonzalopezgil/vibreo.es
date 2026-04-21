export type Region = 'Europe' | 'North America' | 'Latin America' | 'Asia' | 'Africa' | 'Oceania';

export interface Country {
  code: string;
  name: string;
  region?: Region;
}

export const REGIONS: { id: Region; label: string }[] = [
  { id: 'Europe', label: 'Europe' },
  { id: 'North America', label: 'North America' },
  { id: 'Latin America', label: 'Latin America' },
  { id: 'Asia', label: 'Asia' },
  { id: 'Africa', label: 'Africa' },
  { id: 'Oceania', label: 'Oceania' },
];

export const COUNTRY_REGIONS: Record<string, Region> = {
  // Europe (28)
  at: 'Europe', be: 'Europe', bg: 'Europe', ch: 'Europe', cz: 'Europe',
  de: 'Europe', dk: 'Europe', ee: 'Europe', es: 'Europe', fi: 'Europe',
  fr: 'Europe', gb: 'Europe', gr: 'Europe', hu: 'Europe', ie: 'Europe',
  is: 'Europe', it: 'Europe', lt: 'Europe', lu: 'Europe', lv: 'Europe',
  nl: 'Europe', no: 'Europe', pl: 'Europe', pt: 'Europe', ro: 'Europe',
  se: 'Europe', sk: 'Europe', ua: 'Europe',
  // North America (2)
  us: 'North America', ca: 'North America',
  // Latin America (18)
  ar: 'Latin America', bo: 'Latin America', br: 'Latin America', cl: 'Latin America',
  co: 'Latin America', cr: 'Latin America', do: 'Latin America', ec: 'Latin America',
  gt: 'Latin America', hn: 'Latin America', mx: 'Latin America', ni: 'Latin America',
  pa: 'Latin America', pe: 'Latin America', py: 'Latin America', sv: 'Latin America',
  uy: 'Latin America', ve: 'Latin America',
  // Asia (16) — Turkey in Asia per UN M49
  ae: 'Asia', hk: 'Asia', id: 'Asia', in: 'Asia', jp: 'Asia',
  kr: 'Asia', kz: 'Asia', my: 'Asia', ph: 'Asia', pk: 'Asia',
  sa: 'Asia', sg: 'Asia', th: 'Asia', tw: 'Asia', tr: 'Asia', vn: 'Asia',
  // Africa (4)
  eg: 'Africa', ma: 'Africa', ng: 'Africa', za: 'Africa',
  // Oceania (2)
  au: 'Oceania', nz: 'Oceania',
};

export const COUNTRIES: Country[] = [
  { code: 'global', name: 'Global' },
  { code: 'us', name: 'USA' },
  { code: 'gb', name: 'UK' },
  { code: 'es', name: 'Spain' },
  { code: 'mx', name: 'Mexico' },
  { code: 'ar', name: 'Argentina' },
  { code: 'br', name: 'Brazil' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'it', name: 'Italy' },
  { code: 'jp', name: 'Japan' },
  { code: 'kr', name: 'South Korea' },
  { code: 'au', name: 'Australia' },
  { code: 'ca', name: 'Canada' },
  { code: 'co', name: 'Colombia' },
  { code: 'cl', name: 'Chile' },
  { code: 'nl', name: 'Netherlands' },
  { code: 'se', name: 'Sweden' },
  { code: 'in', name: 'India' },
  { code: 'id', name: 'Indonesia' },
  { code: 'tr', name: 'Turkey' },
  { code: 'pt', name: 'Portugal' },
  { code: 'at', name: 'Austria' },
  { code: 'be', name: 'Belgium' },
  { code: 'bo', name: 'Bolivia' },
  { code: 'bg', name: 'Bulgaria' },
  { code: 'ch', name: 'Switzerland' },
  { code: 'cr', name: 'Costa Rica' },
  { code: 'cz', name: 'Czech Republic' },
  { code: 'dk', name: 'Denmark' },
  { code: 'do', name: 'Dominican Rep.' },
  { code: 'ec', name: 'Ecuador' },
  { code: 'eg', name: 'Egypt' },
  { code: 'ee', name: 'Estonia' },
  { code: 'fi', name: 'Finland' },
  { code: 'gr', name: 'Greece' },
  { code: 'gt', name: 'Guatemala' },
  { code: 'hk', name: 'Hong Kong' },
  { code: 'hn', name: 'Honduras' },
  { code: 'hu', name: 'Hungary' },
  { code: 'ie', name: 'Ireland' },
  { code: 'is', name: 'Iceland' },
  { code: 'kz', name: 'Kazakhstan' },
  { code: 'lt', name: 'Lithuania' },
  { code: 'lu', name: 'Luxembourg' },
  { code: 'lv', name: 'Latvia' },
  { code: 'ma', name: 'Morocco' },
  { code: 'my', name: 'Malaysia' },
  { code: 'ng', name: 'Nigeria' },
  { code: 'ni', name: 'Nicaragua' },
  { code: 'no', name: 'Norway' },
  { code: 'nz', name: 'New Zealand' },
  { code: 'pa', name: 'Panama' },
  { code: 'pe', name: 'Peru' },
  { code: 'ph', name: 'Philippines' },
  { code: 'pk', name: 'Pakistan' },
  { code: 'pl', name: 'Poland' },
  { code: 'py', name: 'Paraguay' },
  { code: 'ro', name: 'Romania' },
  { code: 'sa', name: 'Saudi Arabia' },
  { code: 'sg', name: 'Singapore' },
  { code: 'sk', name: 'Slovakia' },
  { code: 'sv', name: 'El Salvador' },
  { code: 'th', name: 'Thailand' },
  { code: 'tw', name: 'Taiwan' },
  { code: 'ua', name: 'Ukraine' },
  { code: 'ae', name: 'UAE' },
  { code: 'uy', name: 'Uruguay' },
  { code: 've', name: 'Venezuela' },
  { code: 'vn', name: 'Vietnam' },
  { code: 'za', name: 'South Africa' },
];

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code);

export function getCountryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code.toLowerCase())?.name || code.toUpperCase();
}
