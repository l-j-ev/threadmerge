'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';

export interface TemplateInput {
  name: string;
  description: string | null;
  isShared: boolean;
  redactionRules: unknown;
}

export async function createTemplate(input: TemplateInput) {
  await apiFetch('/api/templates', { method: 'POST', body: JSON.stringify(input) });
  revalidatePath('/dashboard/templates');
}

export async function updateTemplate(id: string, input: TemplateInput) {
  await apiFetch(`/api/templates/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  revalidatePath('/dashboard/templates');
}

export async function deleteTemplate(id: string) {
  await apiFetch(`/api/templates/${id}`, { method: 'DELETE' });
  revalidatePath('/dashboard/templates');
}
