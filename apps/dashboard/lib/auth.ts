import type { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

const clientId = process.env.AZURE_AD_CLIENT_ID!;
const clientSecret = process.env.AZURE_AD_CLIENT_SECRET!;
const tenantId = process.env.AZURE_AD_TENANT_ID || 'common';

if (!clientId || !clientSecret) {
  throw new Error('AZURE_AD_CLIENT_ID and AZURE_AD_CLIENT_SECRET must be set');
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId,
      clientSecret,
      tenantId,
      authorization: {
        params: {
          // Request our own API audience so the backend can validate + OBO.
          scope: `openid profile email offline_access api://${clientId}/access_as_user`,
        },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : undefined;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
};
