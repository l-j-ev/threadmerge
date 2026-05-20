import { Request, Response, NextFunction } from 'express';
import { validateSSOToken, exchangeForGraphToken } from '../lib/auth';

export interface AuthedRequest extends Request {
  user?: {
    azureUserId: string;
    azureTenantId: string;
    email: string;
    name: string;
  };
  graphToken?: string;
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const ssoToken = authHeader.slice(7);

  try {
    const decoded = await validateSSOToken(ssoToken);
    const graphToken = await exchangeForGraphToken(ssoToken);

    req.user = {
      azureUserId: decoded.oid,
      azureTenantId: decoded.tid,
      email: decoded.preferred_username || decoded.upn || 'unknown',
      name: decoded.name || 'Unknown User',
    };
    req.graphToken = graphToken;
    next();
  } catch (error: any) {
  console.error('Auth middleware error:', error);
  console.error('Token (first 50 chars):', ssoToken.substring(0, 50));
  res.status(401).json({ 
    error: 'Authentication failed', 
    detail: error.message,
    name: error.name,
  });
  }
}
