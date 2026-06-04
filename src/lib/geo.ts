const GEO_SECRET = (import.meta.env.VITE_APP_GEO_SECRET as string | undefined) ?? '';

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Gera assinatura HMAC-SHA256 para um relato de fila.
 *
 * Payload canônico (espelhando o backend):
 *   {lat:.6f}|{lng:.6f}|{accuracy_m:.1f}|{geo_timestamp}
 *
 * Se accuracy_m for null/undefined, usa o literal "null".
 */
export async function buildGeoSignature(
  lat: number,
  lng: number,
  accuracy_m: number | null | undefined,
): Promise<{ geo_signature: string; geo_timestamp: number }> {
  const geo_timestamp = Math.floor(Date.now() / 1000);

  const latStr = lat.toFixed(6);
  const lngStr = lng.toFixed(6);
  const accStr = accuracy_m != null ? accuracy_m.toFixed(1) : 'null';
  const payload = `${latStr}|${lngStr}|${accStr}|${geo_timestamp}`;

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(GEO_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    keyMaterial,
    new TextEncoder().encode(payload),
  );

  return { geo_signature: toHex(signature), geo_timestamp };
}
