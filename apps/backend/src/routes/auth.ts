import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../lib/db';

export const authRouter = Router();

/**
 * Returns the authenticated user and tenant.
 * Upserts both into the database on each call.
 */
authRouter.get('/me', requireAuth, async (req: AuthedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const tenant = await prisma.tenant.upsert({
    where: { azureTenantId: req.user.azureTenantId },
    create: { azureTenantId: req.user.azureTenantId },
    update: {},
  });

  const user = await prisma.user.upsert({
    where: { azureUserId: req.user.azureUserId },
    create: {
      azureUserId: req.user.azureUserId,
      email: req.user.email,
      displayName: req.user.name,
      tenantId: tenant.id,
    },
    update: {
      email: req.user.email,
      displayName: req.user.name,
      lastSeenAt: new Date(),
    },
  });

  res.json({ user, tenant });
});
