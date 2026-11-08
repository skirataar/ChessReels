import { NextRequest, NextResponse } from "next/server";
import {
  getPricingForCountry,
  resolvePricingCountry,
} from "@/lib/pricing";
import { getTierConfig } from "@/lib/tierConfig";


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

  const basePricing = getPricingForCountry(country);
  let pricing = basePricing;

  if (country === "IN") {
    const tierConfig = await getTierConfig();
    const monthlyAmount = tierConfig.proMonthlyPrice;
    const yearlyAmount = Math.round(
      monthlyAmount * 12 * (1 - tierConfig.annualDiscountPercent / 100)
    );
    pricing = {
      ...basePricing,
      monthly: {
        ...basePricing.monthly,
        amount: monthlyAmount,
        display: formatIndiaPrice(monthlyAmount),
      },
      yearly: {
        ...basePricing.yearly,
        amount: yearlyAmount,
        display: formatIndiaPrice(yearlyAmount),
        monthlyEquivalent: formatIndiaPrice(Math.round(yearlyAmount / 12)),
        subtext: `${formatIndiaPrice(Math.round(yearlyAmount / 12))}/mo billed annually`,
      },
    };
  }

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

function formatIndiaPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
