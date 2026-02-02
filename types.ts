
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
  joinDate: string; // ISO Date string
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

export type Language = 'vi' | 'en';
export type Theme = 'light' | 'dark';
