// Permission keys of RetailX CRM. Source of truth: permissions.json (also sent to the License Hub as project.permission_schema).
import schema from './permissions.json';

export type FeatureKey = 'pipeline.manage' | 'analytics.view' | 'data.importExport' | 'data.backup' | 'notes.attachments' | 'print.reports';

/** Default for every feature, taken from permissions.json. */
export const FEATURE_DEFAULTS: Record<string, boolean> = Object.fromEntries(
  schema.permission_schema.flatMap((m) => m.features.map((f) => [f.key, f.default])),
);

/** License says yes/no -> use it. License does not mention the key -> use the schema default. */
export function featureOn(features: Record<string, unknown> | undefined, key: FeatureKey): boolean {
  const v = features?.[key];
  return typeof v === 'boolean' ? v : !!FEATURE_DEFAULTS[key];
}
