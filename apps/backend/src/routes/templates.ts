import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import { prisma } from '../lib/db';

export const templatesRouter = Router();

/**
 * Lists templates for the current user (and shared templates in their tenant).
 */
templatesRouter.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  const tenant = await prisma.tenant.findUnique({
    where: { azureTenantId: req.user!.azureTenantId },
  });
  const user = await prisma.user.findUnique({
    where: { azureUserId: req.user!.azureUserId },
  });

  if (!tenant || !user) {
    res.json([]);
    return;
  }

  const templates = await prisma.template.findMany({
    where: {
      tenantId: tenant.id,
      OR: [{ userId: user.id }, { isShared: true }],
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(templates);
});

/**
 * Creates a new template.
 */
templatesRouter.post('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  const { name, description, isShared, redactionRules } = req.body;

  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { azureTenantId: req.user!.azureTenantId },
  });
  const user = await prisma.user.findUniqueOrThrow({
    where: { azureUserId: req.user!.azureUserId },
  });

  const template = await prisma.template.create({
    data: {
      name,
      description: description || null,
      isShared: isShared || false,
      redactionRules: redactionRules || [],
      userId: user.id,
      tenantId: tenant.id,
    },
  });

  res.status(201).json(template);
});

/**
 * Updates a template (only by its owner).
 */
templatesRouter.put('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { azureUserId: req.user!.azureUserId },
  });

  const template = await prisma.template.findUnique({ where: { id: String(req.params.id) } });
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  if (template.userId !== user.id) {
    res.status(403).json({ error: 'Only the owner can update this template' });
    return;
  }

  const updated = await prisma.template.update({
    where: { id: String(req.params.id) },
    data: {
      name: req.body.name,
      description: req.body.description,
      isShared: req.body.isShared,
      redactionRules: req.body.redactionRules,
    },
  });

  res.json(updated);
});

/**
 * Deletes a template (only by its owner).
 */
templatesRouter.delete('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { azureUserId: req.user!.azureUserId },
  });

  const template = await prisma.template.findUnique({ where: { id: String(req.params.id) } });
  if (!template) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  if (template.userId !== user.id) {
    res.status(403).json({ error: 'Only the owner can delete this template' });
    return;
  }

  await prisma.template.delete({ where: { id: String(req.params.id) } });
  res.status(204).send();
});
