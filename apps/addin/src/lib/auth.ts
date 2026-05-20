const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;

if (!clientId) {
  throw new Error('VITE_AZURE_CLIENT_ID is not set in .env');
}

const SCOPES = [
  'openid',
  'profile',
  'offline_access',
  `api://${clientId}/access_as_user`,
].join(' ');

const REDIRECT_URI = `${window.location.origin}/auth-redirect.html`;

// In-memory token cache
let cachedToken: string | null = null;
let cachedTokenExpiry: number = 0;

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

/**
 * Builds the Microsoft sign-in URL for the Office dialog flow.
 */
function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'token',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    response_mode: 'fragment',
    state,
  });
  return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

/**
 * Opens the Microsoft sign-in flow in an Office dialog and returns the access token.
 * This is the only auth method that works reliably inside Outlook web's iframe.
 */
export async function getAuthToken(): Promise<string> {
  // Check in-memory cache first
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  return new Promise<string>((resolve, reject) => {
    const state = Math.random().toString(36).substring(2);
    const authUrl = buildAuthUrl(state);

    // Dialog opens a same-domain page that then redirects to Microsoft.
    // This avoids the "different security zone" error.
    const startUrl = `${window.location.origin}/auth-start.html?authUrl=${encodeURIComponent(authUrl)}`;

    Office.context.ui.displayDialogAsync(
      startUrl,
      { height: 60, width: 30, promptBeforeOpen: false },
      (result) => {
        if (result.status !== Office.AsyncResultStatus.Succeeded) {
          reject(new Error(`Failed to open dialog: ${result.error?.message || 'unknown'}`));
          return;
        }

        const dialog = result.value;

        dialog.addEventHandler(Office.EventType.DialogMessageReceived, (arg: any) => {
          dialog.close();

          try {
            const payload = JSON.parse(arg.message);
            if (payload.error) {
              reject(new Error(`Auth error: ${payload.error}`));
              return;
            }
            if (!payload.access_token) {
              reject(new Error('Auth completed but no token received'));
              return;
            }

            cachedToken = payload.access_token;
            cachedTokenExpiry = Date.now() + (payload.expires_in - 60) * 1000;
            resolve(payload.access_token);
          } catch (err: any) {
            reject(new Error(`Failed to parse auth response: ${err.message}`));
          }
        });

        dialog.addEventHandler(Office.EventType.DialogEventReceived, (arg: any) => {
          reject(new Error('Sign-in cancelled'));
        });
      }
    );
  });
}

export function clearAuthCache(): void {
  cachedToken = null;
  cachedTokenExpiry = 0;
}