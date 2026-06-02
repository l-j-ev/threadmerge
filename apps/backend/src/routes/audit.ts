import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../lib/db';
import { buildVerifyUrl } from '../lib/hashing';

export const auditRouter = Router();

/**
 * Returns audit log entries for the authenticated user's tenant.
 * Optional query params: userId, from, to, limit
 */
auditRouter.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({
    where: { azureTenantId: req.user!.azureTenantId },
  });
  if (!tenant) {
    res.json([]);
    return;
  }

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const userId = req.query.userId as string | undefined;
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;

  const logs = await prisma.auditLogEntry.findMany({
    where: {
      tenantId: tenant.id,
      ...(userId && { userId }),
      ...(from || to ? { timestamp: { ...(from && { gte: from }), ...(to && { lte: to }) } } : {}),
    },
    include: { user: { select: { email: true, displayName: true } } },
    orderBy: { timestamp: 'desc' },
    take: limit,
  });

  res.json(logs);
});

/**
 * Returns a single audit log entry by ID.
 */
auditRouter.get('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const log = await prisma.auditLogEntry.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true, displayName: true } },
      capturedMessages: { orderBy: { capturedAt: 'asc' } },
    },
  });

  if (!log) {
    res.status(404).json({ error: 'Audit log not found' });
    return;
  }

  // Verify it belongs to the user's tenant
  const tenant = await prisma.tenant.findUnique({
    where: { azureTenantId: req.user!.azureTenantId },
  });
  if (!tenant || log.tenantId !== tenant.id) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const enriched = {
    ...log,
    capturedMessages: log.capturedMessages.map((m) => ({
      ...m,
      verifyUrl: buildVerifyUrl(m.contentHash),
    })),
  };
  res.json(enriched);
});
