// Capture recovery parameters before the SDK clears the URL. Never log tokens.
export function recoveryLocation(url) {
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  return {
    implicit: hash.get('type') === 'recovery' && Boolean(hash.get('access_token')),
    error: hash.get('error_description') || hash.get('error') || url.searchParams.get('error_description') || url.searchParams.get('error'),
  };
}

export async function verifyRecoverySession(client, callbackError) {
  if (callbackError) throw new Error(callbackError);
  // getSession waits for automatic URL processing. Exchanging a PKCE code here
  // again would consume the one-time code twice, including under StrictMode.
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  if (!data?.session) throw new Error('El enlace no es válido o ya venció. Solicita uno nuevo y abre el mensaje más reciente.');
  return data.session;
}
