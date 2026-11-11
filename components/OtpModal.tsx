"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, ShieldCheck, AlertCircle, Loader2, RotateCcw, Check, Pencil } from "lucide-react";

export interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  type: "VERIFY_EMAIL" | "2FA";
  isActivation?: boolean;
  onSuccess: (user: any) => void;
  onEditDetails?: () => void;
}

export function OtpModal({
  isOpen,
  onClose,
  email,
  type,
  isActivation = false,
  onSuccess,
  onEditDetails,
}: OtpModalProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<boolean>(false);

  // Initialize and auto-focus on open
  useEffect(() => {
    if (!isOpen) return;

    setDigits(["", "", "", "", "", ""]);
    setErrorMsg(null);
    setResendCooldown(60);
    setResendSuccess(false);

    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // 60-second resend countdown timer
  useEffect(() => {
    if (!isOpen || resendCooldown <= 0) return;

    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, resendCooldown]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    setErrorMsg(null);
    const cleanVal = value.replace(/\D/g, "");

    if (!cleanVal) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      setDigits(nextDigits);
      return;
    }

    // Handle single character
    const char = cleanVal.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);

    // Auto advance to next box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // If all 6 digits are present, auto submit
      if (nextDigits.every((d) => d.length === 1)) {
        submitCode(nextDigits.join(""));
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const nextDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      nextDigits[i] = pasted[i] || "";
    }
    setDigits(nextDigits);

    if (pasted.length === 6) {
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    } else {
      const nextIdx = Math.min(5, pasted.length);
      inputRefs.current[nextIdx]?.focus();
    }
  };

  const submitCode = async (codeToSubmit?: string) => {
    const code = codeToSubmit || digits.join("");
    if (code.length !== 6) {
      setErrorMsg("Please enter all 6 digits.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (type === "VERIFY_EMAIL") {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Invalid or expired confirmation code.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(data.user);
        onClose();
      } else {
        const res = await fetch("/api/auth/2fa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, code, isActivation }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Invalid or expired security code.");
          setIsSubmitting(false);
          return;
        }

        onSuccess(data.user);
        onClose();
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMsg(null);

    try {
      if (type === "VERIFY_EMAIL") {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, resend: true }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Failed to resend confirmation code.");
          return;
        }
      } else {
        const res = await fetch("/api/auth/2fa/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Failed to resend security code.");
          return;
        }
      }

      setResendCooldown(60);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch {
      setErrorMsg("Network error during resend. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const isVerify = type === "VERIFY_EMAIL";
  const title = isVerify ? "Confirm Your Email" : "Two-Factor Security";
  const subtitle = isVerify
    ? "Enter the 6-digit confirmation code sent to:"
    : "Enter the 6-digit authentication code sent to:";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#0a0908]/95 backdrop-blur-xl border border-[#c29b78]/30 rounded-2xl p-6 max-w-sm w-full mx-auto text-center shadow-2xl relative animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Dismiss Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Security Shield Icon */}
        <div className="w-12 h-12 rounded-2xl bg-[#c29b78]/10 border border-[#c29b78]/25 flex items-center justify-center mx-auto mb-3 text-[#c29b78]">
          <ShieldCheck className="w-6 h-6" />
        </div>

        {/* Header Copy */}
        <h3 className="text-base font-bold text-zinc-100 tracking-tight">{title}</h3>
        <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
        <div className="text-xs font-mono font-medium text-[#c29b78] mt-0.5 truncate px-2">
          {email}
        </div>

        {/* 6 Digit Input Blocks */}
        <div className="flex items-center justify-center gap-2 my-5">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputRefs.current[idx] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={idx === 0 ? handlePaste : undefined}
              className={`w-11 h-12 text-center text-lg font-bold font-mono rounded-xl bg-[#141210] border outline-none transition-all ${
                digit
                  ? "border-[#c29b78] text-white shadow-[0_0_12px_rgba(194,155,120,0.25)]"
                  : "border-white/10 text-zinc-400 focus:border-[#c29b78]/60"
              }`}
            />
          ))}
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="text-rose-400 bg-rose-950/20 border border-rose-500/20 py-2 px-3 rounded-lg text-xs mb-4 flex items-center justify-center gap-1.5 text-left">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Resend Success Banner */}
        {resendSuccess && (
          <div className="text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 py-2 px-3 rounded-lg text-xs mb-4 flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>New code sent to your email.</span>
          </div>
        )}

        {/* Primary Action Button */}
        <button
          type="button"
          disabled={isSubmitting || digits.some((d) => !d)}
          onClick={() => submitCode()}
          className="w-full h-11 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs tracking-wider uppercase transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c29b78]/15"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#0a0908]" />
              <span>Verifying...</span>
            </>
          ) : (
            <span>Verify & Continue</span>
          )}
        </button>

        {/* Edit Details Action (e.g. wrong email typo) */}
        {onEditDetails && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={onEditDetails}
              className="text-xs text-[#c29b78] hover:text-[#d4b08f] transition-colors font-medium flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 stroke-[2]" />
              <span>Wrong email? Edit details</span>
            </button>
          </div>
        )}

        {/* Resend Footer */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] text-xs text-zinc-500">
          {resendCooldown > 0 ? (
            <span className="font-mono text-[11px]">Resend code in {resendCooldown}s</span>
          ) : (
            <button
              type="button"
              disabled={isResending}
              onClick={handleResend}
              className="text-[#c29b78] hover:text-[#d4b08f] font-medium text-xs flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
            >
              {isResending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3 h-3" />
                  <span>Resend Code</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

