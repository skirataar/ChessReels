export async function invokeHelloFunction() {
  const url = process.env.NEON_FUNCTION_HELLO_BASE_URL;
  if (!url) {
    throw new Error("NEON_FUNCTION_HELLO_BASE_URL is not configured");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Neon Function returned status ${response.status}`);
  }

  const text = await response.text();
  return {
    status: response.status,
    output: text,
    url,
  };
}
