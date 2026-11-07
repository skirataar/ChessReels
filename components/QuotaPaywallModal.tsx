"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Clock,
  Crown,
  Infinity as InfinityIcon,
  Loader2,
  Lock,
  Sparkles,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  GeoPricing,
  getPricingForCountry,
  getYearlySavingsPercent,
} from "@/lib/pricing";

interface QuotaPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeComplete?: () => void | Promise<void>;
  userId?: string;
  resetsInMs: number;
  limit?: number;
  windowHours?: number;
  reason?: "quota" | "practice";
}

type PlanType = "monthly" | "yearly";
type CheckoutStatus = "idle" | "loading" | "success" | "error";

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;

const FALLBACK_PRICING = getPricingForCountry("US");

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);

    const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
    if (existing) return resolve(true);

    const scriptId = "razorpay-checkout-script";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true), { once: true });
      existingScript.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

async function waitForActivation(userId?: string): Promise<void> {
  if (!userId) return;

  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      const response = await fetch(
        `/api/user/account?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" }
      );
      if (response.ok) {
        const data = await response.json();
        if (data?.user?.isPro) return;
      }
    } catch {
      // Webhook may still be in flight; keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export function QuotaPaywallModal({
  isOpen,
  onClose,
  onUpgradeComplete,
  userId,
  resetsInMs,
  limit = 4,
  windowHours = 4,
  reason = "quota",
}: QuotaPaywallModalProps) {
  const [msLeft, setMsLeft] = useState<number>(resetsInMs);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("yearly");
  const [pricing, setPricing] = useState<GeoPricing | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  const [status, setStatus] = useState<CheckoutStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const activePricing = pricing ?? FALLBACK_PRICING;
  const savingsPercent = useMemo(
    () => getYearlySavingsPercent(activePricing),
    [activePricing]
  );
  const selectedPrice =
    selectedPlan === "yearly" ? activePricing.yearly : activePricing.monthly;

  useEffect(() => {
    setMsLeft(resetsInMs);
  }, [resetsInMs, isOpen]);

  useEffect(() => {
    if (!isOpen || msLeft <= 0) return;

    const interval = setInterval(() => {
      setMsLeft((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, msLeft]);

  // Reset transient state whenever the modal re-opens.
  useEffect(() => {
    if (!isOpen) return;
    setStatus("idle");
    setErrorMessage("");
  }, [isOpen]);

  // Resolve local pricing (edge geo header → timezone → USD default).
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsLoadingPricing(true);

    const timezone =
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "";

    fetch(`/api/pricing/geo?tz=${encodeURIComponent(timezone)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: GeoPricing | null) => {
        if (!cancelled && data?.monthly && data?.yearly) {
          setPricing(data);
        }
      })
      .catch(() => {
        // Keep the safe USD fallback.
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPricing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const finishUpgrade = useCallback(async () => {
    try {
      await onUpgradeComplete?.();
    } catch {
      // The subscription is already persisted; UI refresh can be retried.
    }
    setStatus("success");
    setTimeout(() => onClose(), 900);
  }, [onClose, onUpgradeComplete]);

  const handleUpgrade = useCallback(async () => {
    if (status === "loading" || status === "success") return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          gateway: activePricing.gateway,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Could not start checkout. Please try again."
        );
      }

      // Local development without provider keys: simulate a successful payment.
      if (data?.mockMode) {
        const activation = await fetch("/api/billing/dev-activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: selectedPlan,
            gateway: activePricing.gateway,
          }),
        });

        const activationData = await activation.json().catch(() => ({}));
        if (!activation.ok) {
          throw new Error(
            typeof activationData?.error === "string"
              ? activationData.error
              : "Could not activate the development subscription."
          );
        }

        await finishUpgrade();
        return;
      }

      if (activePricing.gateway === "razorpay") {
        // Standard Checkout (one-time order) fallback used when Razorpay
        // subscription plan ids are not configured.
        if (data?.checkoutMode === "order" || data?.orderId || data?.order_id) {
          const orderId = (data.orderId || data.order_id) as string | undefined;
          const keyId = (data.keyId ||
            data.key_id ||
            process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) as string | undefined;

          if (!orderId || !keyId) {
            throw new Error("Razorpay order details were incomplete.");
          }

          const loaded = await loadRazorpayScript();
          if (!loaded) {
            throw new Error("Could not load Razorpay Checkout. Check your connection.");
          }

          const RazorpayCtor = (
            window as unknown as { Razorpay?: RazorpayConstructor }
          ).Razorpay;

          if (!RazorpayCtor) {
            throw new Error("Razorpay Checkout is unavailable.");
          }

          const checkout = new RazorpayCtor({
            key: keyId,
            order_id: orderId,
            amount: data.amount,
            currency: data.currency,
            name: "DoomChess",
            description: `${
              selectedPlan === "yearly" ? "Yearly" : "Monthly"
            } Pro`,
            theme: { color: "#c29b78" },
            notes: { plan: selectedPlan },
            modal: {
              ondismiss: () => setStatus("idle"),
            },
            handler: (response: unknown) => {
              void (async () => {
                const payment = response as Partial<RazorpayPaymentResponse>;
                if (
                  !payment?.razorpay_order_id ||
                  !payment.razorpay_payment_id ||
                  !payment.razorpay_signature
                ) {
                  throw new Error(
                    "Razorpay did not return complete payment details."
                  );
                }

                setStatus("loading");

                const verification = await fetch("/api/verify-payment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    razorpay_order_id: payment.razorpay_order_id,
                    razorpay_payment_id: payment.razorpay_payment_id,
                    razorpay_signature: payment.razorpay_signature,
                  }),
                });

                const verificationData = await verification
                  .json()
                  .catch(() => ({}));

                if (!verification.ok || !verificationData?.success) {
                  throw new Error(
                    typeof verificationData?.error === "string"
                      ? verificationData.error
                      : "Payment could not be verified."
                  );
                }

                await finishUpgrade();
              })().catch((error: unknown) => {
                setStatus("error");
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "Payment was received but could not be verified."
                );
              });
            },
          });

          checkout.on("payment.failed", (response: unknown) => {
            const failure = response as {
              error?: { description?: string };
            };
            setStatus("error");
            setErrorMessage(
              failure?.error?.description ||
                "Payment was not completed. No charge was made."
            );
          });

          setStatus("idle");
          checkout.open();
          return;
        }

        if (!data?.subscriptionId || !data?.keyId) {
          throw new Error("Razorpay checkout details were incomplete.");
        }

        const loaded = await loadRazorpayScript();
        if (!loaded) {
          throw new Error("Could not load Razorpay Checkout. Check your connection.");
        }

        const RazorpayCtor = (
          window as unknown as { Razorpay?: RazorpayConstructor }
        ).Razorpay;

        if (!RazorpayCtor) {
          throw new Error("Razorpay Checkout is unavailable.");
        }

        const checkout = new RazorpayCtor({
          key: data.keyId,
          subscription_id: data.subscriptionId,
          name: "DoomChess",
          description: `${
            selectedPlan === "yearly" ? "Yearly" : "Monthly"
          } Pro Subscription`,
          theme: { color: "#c29b78" },
          notes: { plan: selectedPlan },
          modal: {
            ondismiss: () => setStatus("idle"),
          },
          handler: () => {
            void (async () => {
              setStatus("success");
              await waitForActivation(userId);
              await onUpgradeComplete?.();
              setTimeout(() => onClose(), 900);
            })();
          },
        });

        checkout.on("payment.failed", () => {
          setStatus("error");
          setErrorMessage("Payment was not completed. No charge was made.");
        });

        setStatus("idle");
        checkout.open();
        return;
      }

      if (data?.checkoutUrl) {
        window.location.assign(data.checkoutUrl as string);
        return;
      }

      throw new Error("Checkout could not be started. Please try again.");
    } catch (error: unknown) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    }
  }, [
    activePricing.gateway,
    finishUpgrade,
    onClose,
    onUpgradeComplete,
    selectedPlan,
    status,
    userId,
  ]);

  if (!isOpen) return null;

  const hours = Math.floor(msLeft / (3600 * 1000));
  const minutes = Math.floor((msLeft % (3600 * 1000)) / (60 * 1000));
  const seconds = Math.floor((msLeft % (60 * 1000)) / 1000);
  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const isIndia = activePricing.gateway === "razorpay";
  const ctaLabel =
    status === "success"
      ? "Pro Activated"
      : status === "loading"
      ? "Opening Secure Checkout…"
      : `Upgrade to Pro — ${selectedPrice.display}${
          selectedPlan === "yearly" ? "/yr" : "/mo"
        }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to DoomChess Pro"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="w-full max-w-[420px] max-h-[92dvh] overflow-y-auto flex flex-col rounded-[26px] bg-[#12100e] border border-[#c29b78]/30 shadow-[0_24px_80px_rgba(0,0,0,0.75)] text-[#f5f2eb] relative">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#c29b78]/70 to-transparent" />

        <button
          onClick={onClose}
          aria-label="Close paywall modal"
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-400 hover:text-white transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 bg-[radial-gradient(circle_at_top,rgba(194,155,120,0.16),transparent_62%)]">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#e2c3a4] via-[#c29b78] to-[#8a6849] flex items-center justify-center text-[#0a0908] shadow-lg shadow-[#c29b78]/20">
                {reason === "practice" ? (
                  <Crown className="w-6 h-6" strokeWidth={2} />
                ) : (
                  <Clock className="w-6 h-6" strokeWidth={2} />
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#0a0908] border border-[#c29b78]/50 text-[9px] font-black tracking-widest text-[#c29b78]">
                PRO
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#c29b78]">
                <Sparkles className="w-3 h-3" />
                <span>DoomChess Pro</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white leading-tight">
                {reason === "practice" ? "Unlock Practice Mode" : "Free Quota Reached"}
              </h2>
              <p className="text-[11px] text-zinc-400 leading-relaxed mt-0.5">
                {reason === "practice"
                  ? "Custom tactical themes, unranked drills, and unlimited training."
                  : `Free members get ${limit} reels every ${windowHours}h. Go unlimited.`}
              </p>
            </div>
          </div>

          {reason === "quota" ? (
            <div className="mt-4 w-full p-3 rounded-2xl bg-[#0a0908]/80 border border-white/[0.07] flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <Clock className="w-4 h-4 text-[#c29b78] shrink-0" />
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Next free refill
                  </div>
                  <div className="text-sm font-black font-mono text-[#e2c3a4]">
                    {msLeft > 0 ? formattedTime : "Ready to play"}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#c29b78]/10 border border-[#c29b78]/25 text-[#c29b78]">
                {windowHours}h window
              </span>
            </div>
          ) : (
            <div className="mt-4 w-full p-2.5 rounded-2xl bg-[#0a0908]/80 border border-[#c29b78]/25 flex items-center justify-between text-[11px] text-[#e2c3a4] font-bold px-3">
              <span>🎯 Target specific themes</span>
              <span className="px-2 py-0.5 rounded-full bg-[#c29b78]/15 text-[9px] uppercase tracking-wider">
                Mates • Pins • Forks
              </span>
            </div>
          )}
        </div>

        {/* Perks */}
        <div className="px-6 pb-4 space-y-2.5">
          {[
            {
              icon: InfinityIcon,
              title: "Unlimited Daily Tactical Reels",
              text: "No 4-puzzle window cooldown",
            },
            {
              icon: Zap,
              title: "Unlimited Engine Tactical Hints",
              text: "Master every position without limits",
            },
            {
              icon: Trophy,
              title: "Pro Opening Mastery & Repertoire Drills",
              text: "Upcoming exclusive training library",
            },
            {
              icon: BadgeCheck,
              title: "Streak Protection & Gold Badge",
              text: "Keep your streak safe and stand out",
            },
          ].map((perk) => (
            <div key={perk.title} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-md bg-[#c29b78]/10 border border-[#c29b78]/25 flex items-center justify-center text-[#c29b78] shrink-0 mt-0.5">
                <perk.icon className="w-3 h-3" strokeWidth={2.25} />
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-bold text-zinc-100 leading-tight">
                  {perk.title}
                </div>
                <div className="text-[10px] text-zinc-500 leading-tight">
                  {perk.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Plan toggle */}
        <div className="px-6 pb-3">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#0a0908] border border-white/[0.06]">
            <button
              type="button"
              onClick={() => setSelectedPlan("monthly")}
              aria-pressed={selectedPlan === "monthly"}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedPlan === "monthly"
                  ? "bg-[#c29b78] text-[#0a0908] shadow-md shadow-[#c29b78]/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlan("yearly")}
              aria-pressed={selectedPlan === "yearly"}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedPlan === "yearly"
                  ? "bg-[#c29b78] text-[#0a0908] shadow-md shadow-[#c29b78]/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Yearly
              {savingsPercent > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    selectedPlan === "yearly"
                      ? "bg-[#0a0908]/20 text-[#0a0908]"
                      : "bg-emerald-500/15 text-emerald-400"
                  }`}
                >
                  −{savingsPercent}%
                </span>
              )}
            </button>
          </div>

          {/* Price */}
          <div className="mt-3 rounded-2xl bg-[#0a0908]/80 border border-[#c29b78]/20 p-3.5">
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-[#e2c3a4] tracking-tight">
                    {selectedPrice.display}
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {selectedPlan === "yearly" ? "/year" : "/month"}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {selectedPrice.subtext}
                </div>
              </div>

              {selectedPlan === "yearly" && selectedPrice.monthlyEquivalent && (
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Equals
                  </div>
                  <div className="text-sm font-black font-mono text-emerald-400">
                    {selectedPrice.monthlyEquivalent}/mo
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-white/[0.06] flex items-center gap-1.5 text-[10px] text-zinc-500">
              <Lock className="w-3 h-3 text-[#c29b78] shrink-0" />
              <span className="truncate">{activePricing.methods}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 pt-1 space-y-2">
          {status === "error" && errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-300"
            >
              {errorMessage}
            </div>
          )}

          <button
            data-testid="paywall-upgrade-pro-btn"
            onClick={handleUpgrade}
            disabled={status === "loading" || status === "success"}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#e2c3a4] via-[#c29b78] to-[#a9825f] hover:from-[#edd2b8] hover:to-[#bd9672] disabled:opacity-70 disabled:cursor-not-allowed text-[#0a0908] font-black text-sm transition-all shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.985]"
          >
            {status === "loading" || status === "success" ? (
              status === "success" ? (
                <Check className="w-4 h-4" />
              ) : (
                <Loader2 className="w-4 h-4 animate-spin" />
              )
            ) : (
              <Crown className="w-4 h-4" />
            )}
            <span>{ctaLabel}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-transparent hover:bg-white/[0.04] text-zinc-500 hover:text-zinc-300 font-semibold text-[11px] transition-colors cursor-pointer"
          >
            {reason === "practice" ? "Maybe later" : "Wait for free refill"}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[9px] text-zinc-600 pt-0.5">
            <Lock className="w-2.5 h-2.5" />
            <span>
              {isIndia
                ? "Secured by Razorpay • Cancel anytime"
                : "Secured by Lemon Squeezy • Cancel anytime"}
            </span>
            {isLoadingPricing && <span className="text-zinc-700">• detecting region…</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuotaPaywallModal;
