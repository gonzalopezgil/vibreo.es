import { COUNTRIES, COUNTRY_CODES, getCountryName } from '@/lib/countries';

describe('countries', () => {
  it('exports matching country and code lists', () => {
    expect(COUNTRIES.length).toBeGreaterThan(10);
    expect(COUNTRIES[0]).toEqual({ code: 'global', name: 'Global' });
    expect(COUNTRY_CODES).toHaveLength(COUNTRIES.length);
    expect(COUNTRY_CODES).toContain('us');
    expect(COUNTRY_CODES).toContain('es');
  });

  it('looks up country names case-insensitively', () => {
    expect(getCountryName('US')).toBe('USA');
    expect(getCountryName('gb')).toBe('UK');
  });

  it('falls back to the uppercased code for unknown countries', () => {
    expect(getCountryName('xx')).toBe('XX');
  });
});
