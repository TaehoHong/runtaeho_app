export type LanguagePreference = 'system' | 'ko' | 'ja';
export type AppLanguage = 'ko' | 'ja';

export const isLanguagePreference = (value: unknown): value is LanguagePreference =>
  value === 'system' || value === 'ko' || value === 'ja';

export const resolveLanguage = (preference: LanguagePreference, deviceLanguage: string | null): AppLanguage => {
  if (preference !== 'system') return preference;
  return deviceLanguage?.toLowerCase().split(/[-_]/)[0] === 'ja' ? 'ja' : 'ko';
};
