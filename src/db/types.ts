export const CUSTOMER_STATUSES = ['active', 'vip', 'inactive'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const LEAD_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];
export const OPEN_STAGES: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation'];
export const STAGE_PROBABILITY: Record<LeadStage, number> = { new: 10, contacted: 25, qualified: 45, proposal: 65, negotiation: 80, won: 100, lost: 0 };

export const LEAD_SOURCES = ['walk-in', 'referral', 'whatsapp', 'social', 'call', 'website', 'other'] as const;

export const ACTIVITY_TYPES = ['call', 'whatsapp', 'sms', 'email', 'meeting', 'visit', 'note', 'sale', 'payment'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const GROUP_ICONS = ['people', 'star', 'briefcase', 'storefront', 'heart', 'flash', 'home', 'globe'] as const;
export const SWATCHES = ['#4338CA', '#7C3AED', '#0891B2', '#047857', '#B45309', '#C73A37', '#2563EB', '#C026D3'] as const;

export interface Customer {
  id: number;
  name: string;
  company: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  status: CustomerStatus;
  groupId: number | null;
  notes: string;
  createdAt: number;
  updatedAt: number;
  tags?: Tag[];
}

export interface Group { id: number; name: string; color: string; icon: string; createdAt: number; count?: number }
export interface Tag { id: number; name: string; color: string; count?: number }

export interface Lead {
  id: number;
  customerId: number | null;
  name: string;
  phone: string;
  source: string;
  stage: LeadStage;
  value: number;
  expectedClose: string; // YYYY-MM-DD or ''
  notes: string;
  createdAt: number;
  updatedAt: number;
  closedAt: number | null;
}

export interface Activity {
  id: number;
  customerId: number | null;
  leadId: number | null;
  type: ActivityType;
  title: string;
  body: string;
  amount: number;
  at: number;
  createdAt: number;
}

export interface FollowUp {
  id: number;
  customerId: number | null;
  leadId: number | null;
  title: string;
  notes: string;
  channel: ActivityType;
  priority: Priority;
  dueAt: number;
  done: boolean;
  doneAt: number | null;
  createdAt: number;
}

export interface Note { id: number; customerId: number | null; title: string; body: string; pinned: boolean; createdAt: number; updatedAt: number }

export interface Attachment { id: number; customerId: number | null; noteId: number | null; name: string; file: string; mime: string; size: number; createdAt: number }

export interface Settings {
  businessName: string;
  ownerName: string;
  phone: string;
  currency: string;
  countryCode: string;
  theme: 'light' | 'dark' | 'system';
  haptics: boolean;
  notifyEnabled: boolean;
  reminderHour: number;
  onboarded: boolean;
  lastBackupAt: number;
  defaultFollowUpDays: number;
}

export const DEFAULT_SETTINGS: Settings = {
  businessName: 'My Business',
  ownerName: '',
  phone: '',
  currency: 'Rs',
  countryCode: '92',
  theme: 'system',
  haptics: true,
  notifyEnabled: false,
  reminderHour: 9,
  onboarded: false,
  lastBackupAt: 0,
  defaultFollowUpDays: 3,
};
