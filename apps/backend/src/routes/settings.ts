import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../lib/db';

export const settingsRouter = Router();

/**
 * Returns the current tenant's settings, creating a default row on first access.
 */
settingsRouter.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { azureTenantId: req.user!.azureTenantId },
  });

  const settings = await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id },
  });

  res.json(settings);
});

/**
 * Updates the current tenant's settings.
 */
settingsRouter.put('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { azureTenantId: req.user!.azureTenantId },
  });

  const { enforceAuditLogging, allowExternalMerge, defaultRedactions } = req.body;

  const settings = await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {
      ...(typeof enforceAuditLogging === 'boolean' && { enforceAuditLogging }),
      ...(typeof allowExternalMerge === 'boolean' && { allowExternalMerge }),
      ...(defaultRedactions !== undefined && { defaultRedactions }),
    },
    create: {
      tenantId: tenant.id,
      ...(typeof enforceAuditLogging === 'boolean' && { enforceAuditLogging }),
      ...(typeof allowExternalMerge === 'boolean' && { allowExternalMerge }),
      ...(defaultRedactions !== undefined && { defaultRedactions }),
    },
  });

  res.json(settings);
});
