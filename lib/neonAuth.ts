export async function getNeonAuthInfo() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const jwksUrl =
    process.env.NEON_AUTH_JWKS_URL ||
    (baseUrl ? `${baseUrl}/.well-known/jwks.json` : undefined);

  if (!jwksUrl) {
    throw new Error("NEON_AUTH_BASE_URL or NEON_AUTH_JWKS_URL is not configured");
  }

  const response = await fetch(jwksUrl);
  if (!response.ok) {
    throw new Error(`Neon Auth JWKS endpoint returned status ${response.status}`);
  }

  const jwks = await response.json();
  return {
    baseUrl,
    jwksUrl,
    status: response.status,
    keysCount: Array.isArray(jwks?.keys) ? jwks.keys.length : 0,
    keys: jwks?.keys,
  };
}
