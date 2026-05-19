/**
 * Gets an SSO token from Office, allowing prompts for sign-in and consent if needed.
 * The token is a JWT that can be sent to the backend for OBO exchange.
 */
export async function getSSOToken(): Promise<string> {
  try {
    const token = await Office.auth.getAccessToken({
      allowSignInPrompt: true,
      allowConsentPrompt: true,
      forMSGraphAccess: true,
    });
    return token;
  } catch (error: any) {
    // Office SSO errors come back with a `code` property
    console.error('SSO error code:', error.code);
    console.error('SSO error message:', error.message);
    throw new Error(`SSO failed: ${error.message || error.code || 'unknown'}`);
  }
}
