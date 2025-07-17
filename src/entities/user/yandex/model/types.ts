export type TYandexUser = {
  uid: number;
  login: string;
  email: string;
  display: string;
  position: string;
  lastLoginDate: Date;
  disableNotifications?: boolean;
  dismissed?: boolean;
  external?: boolean;
  firstName?: string;
  hasLicense?: boolean;
  lastName?: string;
  passportUid?: number;
  self?: string;
  trackerUid?: number;
  useNewFilters?: boolean;
  welcomeMailSent?: boolean;
};