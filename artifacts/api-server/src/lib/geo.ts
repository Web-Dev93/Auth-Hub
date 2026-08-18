import { logger } from "./logger";

export interface GeoInfo {
  country: string | null;
  city: string | null;
}

const LOCAL_IPS = new Set(["127.0.0.1", "::1", "localhost", ""]);

export async function getGeoInfo(ip: string): Promise<GeoInfo> {
  if (!ip || LOCAL_IPS.has(ip)) {
    return { country: null, city: null };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    if (!res.ok) return { country: null, city: null };

    const data = (await res.json()) as {
      status: string;
      country?: string;
      city?: string;
    };

    if (data.status !== "success") return { country: null, city: null };

    return {
      country: data.country ?? null,
      city: data.city ?? null,
    };
  } catch (err) {
    logger.debug({ err, ip }, "Geo lookup failed");
    return { country: null, city: null };
  }
}
