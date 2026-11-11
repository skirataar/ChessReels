"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Lock,
  Mail,
  Send,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Users,
  RefreshCw,
  FileText,
  X,
  Radio,
  ArrowLeft,
} from "lucide-react";

export default function AdminBroadcastPage() {
  const [passcode, setPasscode] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Broadcast settings
  const [mode, setMode] = useState<"template" | "custom">("template");
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState<string>("");
  const [htmlBody, setHtmlBody] = useState<string>("");
  const [previewTab, setPreviewTab] = useState<"edit" | "preview">("edit");

  // Recipient stats
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState<boolean>(false);

  // Send state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    totalRecipients: number;
    deliveredCount: number;
    message?: string;
  } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Check saved session on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = sessionStorage.getItem("doomchess_broadcast_secret");
      if (saved) {
        setPasscode(saved);
        validateSecret(saved);
      }
    } catch {}
  }, []);

  const validateSecret = async (secretToTest: string) => {
    setAuthError(null);
    setIsLoadingCount(true);
    try {
      const res = await fetch("/api/admin/broadcast", {
        headers: { Authorization: `Bearer ${secretToTest.trim()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Invalid secret passcode.");
        setIsAuthenticated(false);
        try {
          sessionStorage.removeItem("doomchess_broadcast_secret");
        } catch {}
      } else {
        setIsAuthenticated(true);
        setRecipientCount(data.recipientCount ?? 0);
        try {
          sessionStorage.setItem("doomchess_broadcast_secret", secretToTest.trim());
        } catch {}
      }
    } catch {
      setAuthError("Failed to connect to authentication server.");
      setIsAuthenticated(false);
    } finally {
      setIsLoadingCount(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError("Please enter your admin broadcast secret.");
      return;
    }
    validateSecret(passcode);
  };

  const refreshCount = () => {
    if (!passcode) return;
    validateSecret(passcode);
  };

  const handleStartDispatch = () => {
    setSendError(null);
    if (mode === "template") {
      if (!templateId.trim() || isNaN(Number(templateId))) {
        setSendError("Please enter a valid numeric Brevo Template ID.");
        return;
      }
    } else {
      if (!subject.trim()) {
        setSendError("Email subject is required.");
        return;
      }
      if (!htmlBody.trim()) {
        setSendError("Email body content is required.");
        return;
      }
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirmModal(false);
    setIsSending(true);
    setSendResult(null);
    setSendError(null);

    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${passcode.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: mode === "template" ? Number(templateId) : undefined,
          subject: mode === "custom" ? subject.trim() : undefined,
          htmlBody: mode === "custom" ? htmlBody : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSendError(data.error || "Failed to dispatch broadcast.");
      } else {
        setSendResult(data);
        refreshCount();
      }
    } catch {
      setSendError("Network error while dispatching broadcast.");
    } finally {
      setIsSending(false);
    }
  };

  // Passcode Protection Gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0908] text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#12100e] border border-[#c29b78]/30 rounded-2xl p-6 shadow-2xl text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#c29b78]/10 border border-[#c29b78]/25 flex items-center justify-center mx-auto mb-4 text-[#c29b78]">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-zinc-100 uppercase tracking-wider">
            Broadcast Terminal
          </h1>
          <p className="text-xs text-zinc-400 mt-1 mb-5">
            Enter the ADMIN_BROADCAST_SECRET to access the automated mailer.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Admin Broadcast Secret"
              className="w-full h-11 px-3 rounded-xl bg-[#181512] border border-white/10 text-xs text-white placeholder-zinc-500 focus:border-[#c29b78] focus:outline-none font-mono"
            />

            {authError && (
              <div className="text-rose-400 bg-rose-950/20 border border-rose-500/20 py-2 px-3 rounded-lg text-xs text-left">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoadingCount || !passcode.trim()}
              className="w-full h-11 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#c29b78]/15"
            >
              {isLoadingCount ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0a0908]" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Authenticate</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-zinc-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-[#c29b78]/15 border border-[#c29b78]/30 flex items-center justify-center text-[#c29b78]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-zinc-100 tracking-tight">
                Bulk Email Broadcaster
              </h1>
              <p className="text-xs text-zinc-400">
                Automated Brevo v3 transactional email broadcast runner
              </p>
            </div>
          </div>

          {/* Recipient Count Badge */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="px-3.5 py-2 rounded-xl bg-[#12100e] border border-white/10 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#c29b78]" />
              <div className="text-left">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono">
                  Verified Subscribers
                </span>
                <span className="text-xs font-bold text-zinc-100 font-mono">
                  {recipientCount !== null ? recipientCount.toLocaleString() : "--"} users
                </span>
              </div>
            </div>

            <button
              onClick={refreshCount}
              disabled={isLoadingCount}
              title="Refresh subscriber count"
              className="w-9 h-9 rounded-xl bg-[#12100e] hover:bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCount ? "animate-spin text-[#c29b78]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Status / Success Banner */}
        {sendResult && (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-emerald-200">Broadcast Completed</p>
              <p className="mt-0.5">
                Successfully delivered to {sendResult.deliveredCount} out of {sendResult.totalRecipients} subscribers.
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {sendError && (
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-200">Broadcast Failed</p>
              <p className="mt-0.5">{sendError}</p>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("template")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === "template"
                ? "bg-[#181512] border-[#c29b78] shadow-lg shadow-[#c29b78]/10"
                : "bg-[#12100e] border-white/[0.08] hover:border-white/20 text-zinc-400"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Brevo Template ID
              </span>
              <FileText className={`w-4 h-4 ${mode === "template" ? "text-[#c29b78]" : "text-zinc-500"}`} />
            </div>
            <p className="text-[11px] text-zinc-400">
              Trigger a pre-designed Brevo transactional template with personalized parameters.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              mode === "custom"
                ? "bg-[#181512] border-[#c29b78] shadow-lg shadow-[#c29b78]/10"
                : "bg-[#12100e] border-white/[0.08] hover:border-white/20 text-zinc-400"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Custom Obsidian HTML
              </span>
              <Mail className={`w-4 h-4 ${mode === "custom" ? "text-[#c29b78]" : "text-zinc-500"}`} />
            </div>
            <p className="text-[11px] text-zinc-400">
              Compose custom HTML content wrapped inside the branded DoomChess luxury template.
            </p>
          </button>
        </div>

        {/* Form Body */}
        <div className="bg-[#12100e] border border-white/[0.08] rounded-2xl p-6 space-y-5">
          {mode === "template" ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Brevo Template ID (Numeric)
                </label>
                <input
                  type="number"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  placeholder="e.g. 1"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#181512] border border-white/10 text-sm text-white placeholder-zinc-600 focus:border-[#c29b78] focus:outline-none font-mono"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 space-y-1">
                <span className="font-semibold text-zinc-300 block">Automatic Template Parameters:</span>
                <p>The following variables will be injected automatically into your Brevo template:</p>
                <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px] text-[#c29b78]">
                  <span className="px-2 py-0.5 rounded bg-[#c29b78]/10 border border-[#c29b78]/20">params.USERNAME</span>
                  <span className="px-2 py-0.5 rounded bg-[#c29b78]/10 border border-[#c29b78]/20">params.EMAIL</span>
                  <span className="px-2 py-0.5 rounded bg-[#c29b78]/10 border border-[#c29b78]/20">params.UNSUBSCRIBE_URL</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. New Tactical Puzzles & Pro Features Released"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#181512] border border-white/10 text-sm text-white placeholder-zinc-600 focus:border-[#c29b78] focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-zinc-400">
                    Email Content (HTML)
                  </label>
                  <div className="flex gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setPreviewTab("edit")}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                        previewTab === "edit" ? "bg-[#c29b78] text-[#0a0908] font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab("preview")}
                      className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                        previewTab === "preview" ? "bg-[#c29b78] text-[#0a0908] font-bold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </button>
                  </div>
                </div>

                {previewTab === "edit" ? (
                  <textarea
                    rows={8}
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    placeholder="<p>Hey {{USERNAME}},</p><p>We just released new features...</p>"
                    className="w-full p-3.5 rounded-xl bg-[#181512] border border-white/10 text-xs text-white placeholder-zinc-600 focus:border-[#c29b78] focus:outline-none font-mono leading-relaxed"
                  />
                ) : (
                  <div className="p-4 rounded-xl bg-[#0a0908] border border-white/10 min-h-[160px] text-xs leading-relaxed text-zinc-200">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: htmlBody
                          ? htmlBody.replace(/\{\{USERNAME\}\}/g, "Magnus").replace(/\{\{EMAIL\}\}/g, "player@example.com")
                          : "<p class='text-zinc-600 italic'>No content entered yet.</p>",
                      }}
                    />
                  </div>
                )}
                <p className="text-[11px] text-zinc-500 mt-1">
                  Supports tags like <code className="text-zinc-400 font-mono">{"{{USERNAME}}"}</code> and <code className="text-zinc-400 font-mono">{"{{EMAIL}}"}</code>.
                </p>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-mono">
              Recipients: {recipientCount ?? 0}
            </span>

            <button
              type="button"
              disabled={isSending || (recipientCount ?? 0) === 0}
              onClick={handleStartDispatch}
              className="h-11 px-6 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer shadow-lg shadow-[#c29b78]/15 active:scale-[0.98]"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0a0908]" />
                  <span>Dispatching Chunks...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Broadcast</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setShowConfirmModal(false)}
        >
          <div
            className="w-full max-w-md bg-[#12100e] border border-[#c29b78]/40 rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#c29b78]/10 border border-[#c29b78]/25 flex items-center justify-center mx-auto text-[#c29b78]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-zinc-100">
              Confirm Broadcast Launch
            </h3>

            <p className="text-xs text-zinc-300 leading-relaxed">
              You are about to dispatch an automated email broadcast to{" "}
              <strong className="text-[#c29b78] font-mono">{recipientCount} verified subscribers</strong> via Brevo v3.
            </p>

            <div className="p-3 rounded-xl bg-[#181512] border border-white/[0.08] text-left text-xs space-y-1 font-mono">
              <div className="text-zinc-400">
                Mode: <span className="text-zinc-200">{mode === "template" ? `Brevo Template #${templateId}` : "Custom Obsidian HTML"}</span>
              </div>
              {mode === "custom" && (
                <div className="text-zinc-400 truncate">
                  Subject: <span className="text-zinc-200">{subject}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSend}
                className="h-10 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-[#c29b78]/20"
              >
                Confirm &amp; Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

