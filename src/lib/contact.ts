// Open the phone's dialer / WhatsApp / SMS / mail apps. Never throws — returns false when nothing could handle the link.
import { Linking } from 'react-native';
import { waNumber } from './format';

async function open(url: string): Promise<boolean> {
  try { await Linking.openURL(url); return true; } catch { return false; }
}
const digits = (p: string) => p.replace(/[^\d+]/g, '');
export const dial = (phone: string) => open(`tel:${digits(phone)}`);
export const sms = (phone: string, body = '') => open(`sms:${digits(phone)}${body ? `?body=${encodeURIComponent(body)}` : ''}`);
export const mailTo = (email: string) => open(`mailto:${email.trim()}`);
export async function whatsapp(phone: string, cc: string, text = ''): Promise<boolean> {
  const n = waNumber(phone, cc);
  if (!n) return false;
  return (await open(`whatsapp://send?phone=${n}${text ? `&text=${encodeURIComponent(text)}` : ''}`)) || open(`https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`);
}
