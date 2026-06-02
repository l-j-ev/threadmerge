'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';

export interface SettingsInput {
  enforceAuditLogging: boolean;
  allowExternalMerge: boolean;
  defaultRedactions: unknown;
}

export async function updateSettings(input: SettingsInput) {
  await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(input) });
  revalidatePath('/dashboard/settings');
}
