/** Synthetic UI fixtures. Every request is handled here or rejected; no network fallback. */
import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import type { UserDataDto } from '~/features/user/models/UserDataDto';
import { AuthProviderType } from '~/features/auth/models/AuthType';
import type { Shoe } from '~/features/shoes/models/Shoe';
import type { Item } from '~/features/avatar/models/Item';
import type { RunningRecord } from '~/features/running/models/RunningRecord';
import type { GarminConnection } from '~/features/garmin/services/garminService';
import { QA_TOKEN_PREFIX } from './config';

export const QA_SCENARIOS = ['populated', 'empty', 'long', 'loading', 'error', 'terms', 'league-result', 'guest'] as const;
export type QaScenario = typeof QA_SCENARIOS[number];
let scenario: QaScenario = 'populated';
let failed = new Set<string>();
const now = () => Math.floor(Date.now() / 1000);
const iso = () => new Date().toISOString();

const itemNames = [
  ['Normal_Hair9', 'New_Hair_01', 'New_Hair_02', 'New_Hair_03'],
  ['New_Cloth_10', 'New_Cloth_01', 'New_Cloth_02', 'New_Cloth_03'],
  ['New_Pant_02', 'New_Pant_01', 'New_Pant_03', 'New_Pant_04'],
];
const parts = ['Hair', 'Cloth', 'Pant'];
let items: Item[];
let shoes: Shoe[];
let records: RunningRecord[];
let user: UserDataDto;
let configuration: Record<string, unknown>;
let notifications: Record<string, unknown>[];
let notificationConfiguration: Record<string, unknown>;
let leagueJoined = true;
let resultPending = false;

export function configureQaScenario(value: string): QaScenario {
  if (!QA_SCENARIOS.includes(value as QaScenario)) throw new Error(`Unknown QA scenario: ${value}`);
  scenario = value as QaScenario;
  failed = new Set();
  items = itemNames.flatMap((names, type) => names.map((name, index) => ({
    id: (type + 1) * 100 + index, name, itemType: { id: type + 1, name: ['머리', '의상', '바지'][type]! },
    unityFilePath: `Assets/05.Resource/${parts[type]}/`, filePath: `/assets/items/${parts[type]}/`,
    point: index === 3 ? 99999 : index * 1000, createdAt: iso(), isOwned: index < 2,
  })));
  shoes = scenario === 'empty' ? [] : Array.from({ length: 8 }, (_, index) => ({
    id: index + 1, brand: ['Nike', 'Adidas', 'ASICS', 'New Balance'][index % 4]!,
    model: scenario === 'long' ? '매우 긴 러닝화 모델 이름과 숫자 1234567890' : ['Pegasus 41', 'Ultraboost 22', 'GEL-KAYANO 31', 'Fresh Foam X'][index % 4]!,
    totalDistance: index * 85300, targetDistance: 500000, isMain: index === 0,
    isEnabled: index < 6, createdAt: iso(), updatedAt: iso(),
  }));
  records = scenario === 'empty' ? [] : Array.from({ length: 16 }, (_, index) => ({
    id: 101 + index, distance: index === 0 ? 5120 : 3200 + index * 314,
    durationSec: 1800 + index * 100, steps: 5100 + index * 100, cadence: 172,
    heartRate: 145, calorie: 320, startTimestamp: now() - (index + 1) * 86400,
    endTimestamp: now() - (index + 1) * 86400 + 1800 + index * 100,
    source: 'LIVE', shoeId: index % 2 === 0 ? 1 : null,
    connectedShoe: index % 2 === 0 ? shoes[0] ?? null : null,
  }));
  user = {
    id: 900001, name: scenario === 'long' ? '아주긴닉네임테스트사용자1234567890' : 'QA 태호',
    authorityType: 'USER', totalPoint: scenario === 'long' ? 123456789 : scenario === 'empty' ? 0 : 26780,
    userAccounts: [{ id: 900001, email: 'ui-qa@example.invalid', accountType: AuthProviderType.GOOGLE }],
    avatarId: 900001, haveRunningRecord: records.length > 0, hairColor: '#8B4513',
    equippedItems: items.filter(item => item.id % 100 === 0).map(item => ({
      id: item.id, name: item.name, itemTypeId: item.itemType.id,
      filePath: item.filePath, unityFilePath: item.unityFilePath,
    })),
  };
  configuration = { userId: user.id, healthImportEnabled: false, healthImportLastSyncedTimestamp: null, language: 'ko' };
  notifications = scenario === 'empty' ? [] : Array.from({ length: 12 }, (_, index) => ({
    id: index + 1, type: index % 3 === 0 ? 'NOTICE' : 'RUNNING_REMINDER',
    title: scenario === 'long' ? '아주 긴 알림 제목입니다. 여러 줄에서 잘림과 여백을 확인합니다.' : `로컬 QA 알림 ${index + 1}`,
    body: '테스트 데이터입니다.\n줄바꿈과 본문 간격을 확인합니다.\n실제 알림이 아닙니다.',
    leagueParticipantId: null, readDatetime: index % 2 ? iso() : null, createdDatetime: iso(),
  }));
  notificationConfiguration = { pushEnabled: false, leaguePushEnabled: true, reminderPushEnabled: true, noticePushEnabled: true, timezone: 'Asia/Seoul' };
  leagueJoined = scenario !== 'empty';
  resultPending = scenario === 'league-result';
  console.info(`[UI_QA] scenario=${scenario}; synthetic data; HTTP adapter has no network fallback`);
  return scenario;
}

export function qaTokens() {
  const payload = btoa(JSON.stringify({ userId: 900001, nickname: 'UI QA', authority: 'USER',
    isAgreedOnTerms: scenario !== 'terms', iat: now(), exp: now() + 86400 }));
  return { accessToken: `${QA_TOKEN_PREFIX}${payload}.local-only`, refreshToken: 'ui-qa.local-only' };
}

function bodyOf(value: unknown): Record<string, any> {
  if (typeof value === 'string') return JSON.parse(value);
  if (value && typeof value === 'object' && 'getParts' in value) {
    const parts = (value as { getParts(): { fieldName: string; string?: string }[] }).getParts();
    return Object.fromEntries(parts.map(part => [part.fieldName, part.string]));
  }
  return (value ?? {}) as Record<string, any>;
}

function page<T extends { id: number }>(rows: T[], params: Record<string, any>) {
  const offset = params.cursor == null ? 0 : rows.findIndex(row => row.id === Number(params.cursor)) + 1;
  const content = rows.slice(offset, offset + Number(params.size ?? 30));
  return { content, cursor: content.at(-1)?.id ?? null, hasNext: offset + content.length < rows.length };
}

function league() {
  return { sessionId: 1, tierName: 'SILVER', myRank: 3, totalParticipants: 12,
    myDistance: 25300, promotionCutRank: 3, relegationCutRank: 10, remainingDays: 3,
    seasonEndDatetime: new Date(Date.now() + 3 * 86400000).toISOString(),
    participants: Array.from({ length: 12 }, (_, index) => ({ id: 1000 + index, rank: index + 1,
      nickname: index === 2 ? user.name : `QA 러너 ${index + 1}`, profileImageUrl: null,
      distance: 30000 - index * 2350, isMe: index === 2, isBot: false })) };
}

function result() {
  return { previousTier: 'BRONZE', currentTier: 'SILVER', resultStatus: 'PROMOTED',
    finalRank: 3, totalParticipants: 12, totalDistance: 25300, rewardPoints: 1000, participants: league().participants };
}

function resolve(method: string, path: string, params: Record<string, any>, body: Record<string, any>): unknown {
  if (path === '/app/version-check') return { forceUpdate: false, minimumVersion: null, message: null };
  if (path === '/auth/refresh' || path.startsWith('/oauth/')) return qaTokens();
  if (path === '/users/me') {
    if (method === 'patch' && body.nickname) user.name = body.nickname;
    return method === 'patch' ? { id: user.id, nickname: user.name } : user;
  }
  if (path === '/users/configuration') { Object.assign(configuration, body); return configuration; }
  if (path === '/users/points') return { userId: user.id, point: user.totalPoint };
  if (path === '/users/points/histories') {
    const rows = scenario === 'empty' ? [] : Array.from({ length: 45 }, (_, index) => ({
      id: index + 1, point: index % 3 === 0 ? -1000 : 500 + index,
      pointType: index % 3 === 0 ? '아이템 구매' : '러닝 포인트', createdTimestamp: now() - index * 3600,
    })).filter(row => params.isEarned == null || (row.point > 0) === params.isEarned);
    return page(rows, params);
  }
  if (path === '/shoes') {
    if (method === 'post') { const shoe = { id: Date.now(), totalDistance: 0, isEnabled: true, ...body } as Shoe; shoes.push(shoe); return shoe; }
    const rows = shoes.filter(shoe => params.isEnabled == null || shoe.isEnabled === params.isEnabled);
    return params.size != null || params.cursor != null ? page(rows, params) : rows;
  }
  if (/^\/shoes\/\d+/.test(path)) {
    const shoe = shoes.find(row => row.id === Number(path.split('/')[2]));
    if (!shoe) throw new Error('Fixture shoe not found');
    if (path.endsWith('/main')) shoes.forEach(row => { row.isMain = row === shoe; });
    Object.assign(shoe, body);
    if (body.isDeleted) shoes = shoes.filter(row => row !== shoe);
    return shoe;
  }
  if (path === '/running/statistics') {
    const start = new Date(params.startDateTime); const end = new Date(params.endDateTime);
    const inPeriod = records.filter(row => row.startTimestamp * 1000 >= start.getTime() && row.startTimestamp * 1000 <= end.getTime());
    const totalDistance = inPeriod.reduce((sum, row) => sum + row.distance, 0);
    const totalDurationSec = inPeriod.reduce((sum, row) => sum + row.durationSec, 0);
    return { statisticType: params.statisticType, runningCount: inPeriod.length, totalDistance, totalDurationSec,
      averageDistance: inPeriod.length ? totalDistance / inPeriod.length : 0,
      averagePaceSec: totalDistance ? totalDurationSec / totalDistance : 0,
      chartData: inPeriod.map(row => ({ datetime: new Date(row.startTimestamp * 1000).toISOString().slice(0, 10),
        distance: row.distance, durationSec: row.durationSec, paceSec: row.durationSec / row.distance })) };
  }
  if (path === '/running') {
    if (method === 'post') { const row = { id: Date.now(), distance: 0, durationSec: 0, cadence: null, heartRate: null, calorie: 0, steps: null, ...body } as RunningRecord; records.unshift(row); return { id: row.id }; }
    return page(records.filter(row => (params.startTimestamp == null || row.startTimestamp >= params.startTimestamp) && (params.endTimestamp == null || row.startTimestamp <= params.endTimestamp)), params);
  }
  if (/^\/running\/\d+/.test(path)) {
    const row = records.find(record => record.id === Number(path.split('/')[2]));
    if (!row) throw new Error('Fixture record not found');
    if (path.endsWith('/items')) return { items: row.id % 2 === 1 ? [{
      distance: row.distance, durationSec: row.durationSec, cadence: row.cadence, heartRate: row.heartRate,
      minHeartRate: 120, maxHeartRate: 160, orderIndex: 0, startTimeStamp: row.startTimestamp,
      endTimeStamp: row.endTimestamp, gpsPoints: Array.from({ length: 21 }, (_, index) => ({
        // Synthetic public square coordinates, not a user's recorded location.
        latitude: 37.5665 + index * 0.00015, longitude: 126.978 + Math.sin(index / 3) * 0.001,
        timestampMs: (row.startTimestamp + index * row.durationSec / 20) * 1000,
        speed: 2.8, altitude: 20, accuracy: 5,
      })),
    }] : [] };
    if (path.endsWith('/shoe')) { row.shoeId = body.shoeId; row.connectedShoe = shoes.find(shoe => shoe.id === body.shoeId) ?? null; }
    if (method === 'put' || path.endsWith('/end')) Object.assign(row, body);
    if (path.endsWith('/end')) { user.totalPoint += 100; return { ...row, point: user.totalPoint, acceptanceStatus: 'ACCEPTED' }; }
    return row;
  }
  if (path === '/items') return page(items.filter(item => params.itemType == null || item.itemType.id === Number(params.itemType)), params);
  if (path === '/user-items') { items.forEach(item => { if (body.itemIds?.includes(item.id) && !item.isOwned) { item.isOwned = true; user.totalPoint -= item.point; } }); return null; }
  if (path.startsWith('/avatars/')) {
    if (body.hairColor) user.hairColor = body.hairColor;
    if (body.itemIds) user.equippedItems = items.filter(item => body.itemIds.includes(item.id)).map(item => ({ ...item, itemTypeId: item.itemType.id }));
    return { id: user.avatarId, userId: user.id, isMain: true, hairColor: user.hairColor,
      items: items.filter(item => user.equippedItems.some(equipped => equipped.id === item.id)) };
  }
  if (path === '/league/current') return leagueJoined ? league() : null;
  if (path === '/league/join') { leagueJoined = true; return null; }
  if (path === '/league/profile') return { currentTier: 'SILVER', highestTier: 'SILVER', totalSeasons: 3, totalDistance: 120000, averageRank: 3 };
  if (path === '/league/result') return resultPending ? result() : null;
  if (path.endsWith('/confirm')) { resultPending = false; return null; }
  if (path.startsWith('/league/results/')) return result();
  if (path === '/notifications/configuration' || path === '/notifications/configuration/timezone') { Object.assign(notificationConfiguration, body); return notificationConfiguration; }
  if (path === '/notifications/device') return null;
  if (path === '/notifications') return page(notifications.filter(row => params.type == null || row.type === params.type) as { id: number }[], params);
  if (/^\/notifications\/\d+\/open$/.test(path)) { const row = notifications.find(row => row.id === Number(path.split('/')[2])); if (row) row.readDatetime = iso(); return row; }
  if (path.startsWith('/push')) return null;
  if (path === '/garmin/connection') {
    const connection: GarminConnection = { available: false, status: 'DISCONNECTED', connectedAt: null, lastReceivedAt: null, lastImportedAt: null, lastImportedCount: 0, permissionGranted: false };
    return connection;
  }
  if (path === '/terms') return { terms: ['SERVICE', 'PRIVATE', 'LOCATION'].map((type, index) => ({ id: index + 1, type, isRequired: true, link: `https://example.com/?qaTerm=${type}` })) };
  if (path === '/users/agreement') { scenario = 'populated'; return null; }
  if (path === '/inquiries') return { trackingNo: 'LOCAL-UI-QA-0001' };
  throw new Error(`Unhandled UI fixture: ${method.toUpperCase()} ${path}`);
}

configureQaScenario('populated');

export const qaAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const path = new URL(config.url ?? '/', 'http://local-ui-qa.invalid').pathname.replace(/^\/api\/v1/, '');
  const method = config.method ?? 'get';
  const response = { data: null as unknown, status: 200, statusText: 'OK', config, headers: new AxiosHeaders() };
  console.info(`[UI_QA] ${method.toUpperCase()} ${path}`);
  if (scenario === 'loading') await new Promise(resolve => setTimeout(resolve, 1800));
  const key = `${method} ${path}`;
  if (scenario === 'error' && method === 'get' && !['/users/me', '/users/points', '/users/configuration', '/app/version-check'].includes(path) && !failed.has(key)) {
    failed.add(key);
    throw new AxiosError('Local UI QA simulated failure (next attempt succeeds)', 'ERR_BAD_RESPONSE', config, undefined, { ...response, status: 503, data: { message: 'Local QA retry scenario' } });
  }
  try { response.data = JSON.parse(JSON.stringify(resolve(method, path, config.params ?? {}, bodyOf(config.data)))); }
  catch (error) { throw new AxiosError(String(error), 'ERR_BAD_RESPONSE', config, undefined, { ...response, status: 501 }); }
  return response;
};
