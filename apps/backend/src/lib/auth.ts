import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { ConfidentialClientApplication } from '@azure/msal-node';

const tenantId = 'common'; // multi-tenant

if (!process.env.AZURE_CLIENT_ID) {
  throw new Error('AZURE_CLIENT_ID environment variable is required');
}
if (!process.env.AZURE_CLIENT_SECRET) {
  throw new Error('AZURE_CLIENT_SECRET environment variable is required');
}

const jwks = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000,
});

function getSigningKey(header: JwtHeader, callback: SigningKeyCallback): void {
  if (!header.kid) {
    return callback(new Error('No kid in token header'));
  }
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key?.getPublicKey());
  });
}

export interface DecodedSSOToken {
  oid: string; // Azure object ID (stable user ID)
  tid: string; // Tenant ID
  preferred_username?: string;
  upn?: string;
  name?: string;
  scp?: string;
}

/**
 * Validates an Office SSO token by checking signature, audience, and issuer.
 */
export async function validateSSOToken(token: string): Promise<DecodedSSOToken> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        audience: `api://${process.env.AZURE_CLIENT_ID}`,
        algorithms: ['RS256'],
        // For multi-tenant: validate issuer is from Microsoft's identity platform
        issuer: undefined, // We'll do issuer validation manually below
      },
      (err, decoded) => {
        if (err) return reject(err);
        const token = decoded as DecodedSSOToken & { iss?: string };

        // Manual issuer check for multi-tenant
        if (
          !token.iss ||
          !token.iss.startsWith('https://login.microsoftonline.com/') &&
          !token.iss.startsWith('https://sts.windows.net/')
        ) {
          return reject(new Error(`Invalid issuer: ${token.iss}`));
        }

        if (!token.oid || !token.tid) {
          return reject(new Error('Token missing required claims (oid, tid)'));
        }

        resolve(token);
      }
    );
  });
}

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
  },
};

const cca = new ConfidentialClientApplication(msalConfig);

/**
 * Exchanges an SSO token for a Microsoft Graph access token using the on-behalf-of flow.
 */
export async function exchangeForGraphToken(ssoToken: string): Promise<string> {
  const result = await cca.acquireTokenOnBehalfOf({
    oboAssertion: ssoToken,
    scopes: [
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/Mail.ReadWrite',
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/User.Read',
    ],
  });

  if (!result?.accessToken) {
    throw new Error('On-behalf-of token exchange returned no access token');
  }

  return result.accessToken;
}
