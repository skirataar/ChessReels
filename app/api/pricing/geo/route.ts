import { NextRequest, NextResponse } from "next/server";
import {
  getPricingForCountry,
  resolvePricingCountry,
} from "@/lib/pricing";


/**
 * GET /api/pricing/geo
 *
 * Zero external API calls. Uses edge geo headers when deployed, a `?country=IN`
 * override for local testing, and finally the browser timezone (sent as `?tz=`
 * by the client) so localhost can still resolve India pricing.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const countryOverride =
    searchParams.get("country") || searchParams.get("countryCode");

  const headerCountry =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code");

  const timezone =
    searchParams.get("tz") ||
    request.headers.get("x-timezone") ||
    request.headers.get("x-vercel-ip-timezone");

  const { country, source } = resolvePricingCountry({
    countryOverride,
    headerCountry,
    timezone,
  });

  const pricing = getPricingForCountry(country);

  return NextResponse.json(
    {
      ...pricing,
      country,
      source,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
