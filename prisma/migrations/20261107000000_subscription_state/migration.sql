-- Dual-gateway subscription state (Razorpay + Lemon Squeezy / global checkout)
-- Idempotent so it can be applied to databases that already contain the columns.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isPro" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "providerSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_providerSubscriptionId_idx" ON "User"("providerSubscriptionId");
