import type { LanguagePreference } from '~/i18n/language';

export interface UserConfiguration {
  userId: number;
  healthImportEnabled: boolean;
  healthImportLastSyncedTimestamp: number | null;
  language: LanguagePreference;
}

export interface UpdateUserConfiguration {
  healthImportEnabled?: boolean;
  language?: LanguagePreference;
}
