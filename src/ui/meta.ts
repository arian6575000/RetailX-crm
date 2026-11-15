// Visual vocabulary for domain values: one icon + one colour per activity type, pipeline stage, priority and status.
import type { Colors } from '../lib/theme';
import type { ActivityType, CustomerStatus, LeadStage, Priority } from '../db/types';
import type { IconName } from './kit';

export const ACTIVITY_META: Record<ActivityType, { label: string; icon: IconName; color: (c: Colors) => string }> = {
  call: { label: 'Call', icon: 'call', color: (c) => c.primary },
  whatsapp: { label: 'WhatsApp', icon: 'logo-whatsapp', color: (c) => c.success },
  sms: { label: 'SMS', icon: 'chatbubble-ellipses', color: (c) => c.accent },
  email: { label: 'Email', icon: 'mail', color: (c) => c.secondary },
  meeting: { label: 'Meeting', icon: 'people', color: (c) => c.warning },
  visit: { label: 'Visit', icon: 'walk', color: (c) => c.accent },
  note: { label: 'Note', icon: 'document-text', color: (c) => c.textMuted },
  sale: { label: 'Sale', icon: 'receipt', color: (c) => c.success },
  payment: { label: 'Payment', icon: 'cash', color: (c) => c.success },
};

export const STAGE_META: Record<LeadStage, { label: string; color: (c: Colors) => string }> = {
  new: { label: 'New', color: (c) => c.accent },
  contacted: { label: 'Contacted', color: (c) => c.primary },
  qualified: { label: 'Qualified', color: (c) => c.secondary },
  proposal: { label: 'Proposal', color: (c) => c.warning },
  negotiation: { label: 'Negotiation', color: () => '#C026D3' },
  won: { label: 'Won', color: (c) => c.success },
  lost: { label: 'Lost', color: (c) => c.danger },
};

export const PRIORITY_META: Record<Priority, { label: string; color: (c: Colors) => string; tone: 'neutral' | 'warning' | 'danger' }> = {
  low: { label: 'Low', color: (c) => c.textFaint, tone: 'neutral' },
  medium: { label: 'Medium', color: (c) => c.warning, tone: 'warning' },
  high: { label: 'High', color: (c) => c.danger, tone: 'danger' },
};

export const STATUS_META: Record<CustomerStatus, { label: string; tone: 'success' | 'secondary' | 'neutral'; icon: IconName }> = {
  active: { label: 'Active', tone: 'success', icon: 'checkmark-circle' },
  vip: { label: 'VIP', tone: 'secondary', icon: 'star' },
  inactive: { label: 'Inactive', tone: 'neutral', icon: 'moon' },
};

export const SOURCE_LABEL: Record<string, string> = { 'walk-in': 'Walk-in', referral: 'Referral', whatsapp: 'WhatsApp', social: 'Social media', call: 'Phone call', website: 'Website', other: 'Other' };
