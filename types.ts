
export interface TelegramGroup {
  id: string;
  name: string;
  memberCount: number;
  type: 'group' | 'channel' | 'supergroup';
  avatar?: string;
}

export interface TelegramMember {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  lastSeen?: string;
  isPublicPhone: boolean;
  joinDate: string;
  hasReacted: boolean;
  hasMessaged: boolean;
  avatarUrl?: string;
}

export interface ScanResult {
  groupId: string;
  groupName: string;
  timestamp: string;
  members: TelegramMember[];
  totalInGroup: number;
}

export enum AppTab {
  LOGIN = 'login',
  DASHBOARD = 'dashboard',
  RESULTS = 'results',
  SETTINGS = 'settings'
}

export enum LoginStep {
  METHOD_SELECT = 'method_select',
  API_CONFIG = 'api_config',
  PHONE_NUMBER = 'phone_number',
  OTP_VERIFICATION = 'otp_verification',
  PASSWORD_2FA = 'password_2fa',
  QR_CODE = 'qr_code'
}

export type Theme = 'light' | 'dark';
