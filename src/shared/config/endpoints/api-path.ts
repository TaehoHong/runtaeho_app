export class ApiPath {
  static readonly Base = 'api/v1';

  static readonly Auth = {
    refresh: `${ApiPath.Base}/auth/refresh`,
    googleOAuth: `${ApiPath.Base}/oauth/google`,
    appleOAuth: `${ApiPath.Base}/oauth/apple`,
  };

  static readonly User = {
    base: `${ApiPath.Base}/users`,
    me: `${ApiPath.Base}/users/me`,
  };

  static readonly RunningRecord = {
    base: `${ApiPath.Base}/running`,
    search: `${ApiPath.Base}/running`,
    start: `${ApiPath.Base}/running`,
    end: (id: number) => `${ApiPath.Base}/running/${id}/end`,
    put: (id: number) => `${ApiPath.Base}/running/${id}`,
  };

  static readonly RunningRecordItem = {
    base: `${ApiPath.Base}/running`,
    save: (id: number) => `${ApiPath.Base}/running/${id}/items`,
  };

  static readonly Point = {
    base: `${ApiPath.Base}/users/points`,
    add: `${ApiPath.Base}/users/points`,
    histories: `${ApiPath.Base}/users/points/histories`,
  };

  static readonly Shoe = {
    base: `${ApiPath.Base}/shoes`,
    list: `${ApiPath.Base}/shoes`,
    create: `${ApiPath.Base}/shoes`,
    get: (id: number) => `${ApiPath.Base}/shoes/${id}`,
    patch: (id: number) => `${ApiPath.Base}/shoes/${id}`,
  };

  static readonly Avatar = {
    base: `${ApiPath.Base}/avatars`,
    put: (id: number) => `${ApiPath.Base}/avatars/${id}`,
  };

  static readonly Item = {
    base: `${ApiPath.Base}/items`,
    list: `${ApiPath.Base}/items`,
  };

  static readonly UserItem = {
    base: `${ApiPath.Base}/user-items`,
    post: `${ApiPath.Base}/user-items`,
  };
}