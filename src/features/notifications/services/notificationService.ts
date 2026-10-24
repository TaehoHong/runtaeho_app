import { apiClient } from '~/services/api/client';
import { getSessionSnapshot, isSessionCurrent } from '~/features/auth/stores/authStore';
import { SessionSupersededError } from '~/utils/storage/errors';

export interface NotificationItem {
  id: number;
  type: 'LEAGUE_RESULT' | 'RUNNING_REMINDER' | 'NOTICE';
  title: string;
  body: string;
  leagueParticipantId: number | null;
  readDatetime: string | null;
  createdDatetime: string;
}
export interface NotificationConfiguration {
  pushEnabled: boolean;
  leaguePushEnabled: boolean;
  reminderPushEnabled: boolean;
  noticePushEnabled: boolean;
  timezone: string | null;
}
export interface NotificationPage {
  content: NotificationItem[];
  cursor: number | null;
  hasNext: boolean;
}

const base = '/notifications';
export const notificationService = {
  async list(language: string, cursor?: number, signal?: AbortSignal, type?: 'NOTICE'): Promise<NotificationPage> {
    const snapshot = getSessionSnapshot();
    const { data } = await apiClient.get<NotificationPage>(base, { params: { language, cursor, type }, ...(signal ? { signal } : {}), sessionSnapshot: snapshot });
    if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
    return data;
  },
  async open(id: number, language: string): Promise<NotificationItem> {
    const snapshot = getSessionSnapshot();
    const { data } = await apiClient.post<NotificationItem>(`${base}/${id}/open`, null, { params: { language }, sessionSnapshot: snapshot });
    if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
    return data;
  },
  async configuration(): Promise<NotificationConfiguration> {
    const snapshot = getSessionSnapshot();
    const { data } = await apiClient.get<NotificationConfiguration>(`${base}/configuration`, { sessionSnapshot: snapshot });
    if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
    return data;
  },
  async configure(value: NotificationConfiguration): Promise<NotificationConfiguration> {
    const snapshot = getSessionSnapshot();
    const { data } = await apiClient.put<NotificationConfiguration>(`${base}/configuration`, value, { sessionSnapshot: snapshot });
    if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
    return data;
  },
  async updateTimezone(timezone: string): Promise<void> {
    const snapshot = getSessionSnapshot();
    await apiClient.patch<void>(`${base}/configuration/timezone`, { timezone }, { sessionSnapshot: snapshot });
    if (!isSessionCurrent(snapshot)) throw new SessionSupersededError();
  },
};

// Remote payloads can only select a numeric inbox item, never an arbitrary URL or route.
export function notificationIdFromData(data: Record<string, unknown>): number | null {
  const raw = data.notificationId;
  if (typeof raw !== 'number' && (typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw))) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
