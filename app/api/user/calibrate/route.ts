import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, step, finalElo, isFinished } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    if (isFinished || (typeof step === "number" && step >= 6)) {
      // Allow calibration to accurately reflect true tactical rating up to 2800
      const settledElo = Math.max(400, Math.min(2800, typeof finalElo === "number" ? finalElo : user.elo));

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          isCalibrated: true,
          calibrationStep: 6,
          elo: settledElo,
          peakElo: Math.max(user.peakElo, settledElo),
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          elo: true,
          peakElo: true,
          streak: true,
          isCalibrated: true,
          calibrationStep: true,
        },
      });

      return NextResponse.json({
        success: true,
        calibrated: true,
        user: updated,
      });
    }

    // Otherwise, record step progress
    const nextStep = typeof step === "number" ? step : user.calibrationStep + 1;
    const currentEstimatedElo = typeof finalElo === "number" ? Math.max(400, Math.min(2800, finalElo)) : user.elo;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        calibrationStep: nextStep,
        elo: currentEstimatedElo,
        peakElo: Math.max(user.peakElo, currentEstimatedElo),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        elo: true,
        peakElo: true,
        streak: true,
        isCalibrated: true,
        calibrationStep: true,
      },
    });

    return NextResponse.json({
      success: true,
      calibrated: false,
      user: updated,
    });
  } catch (error) {
    console.error("Calibration update failed:", error);
    return NextResponse.json(
      { error: "Failed to update calibration." },
      { status: 500 }
    );
  }
}
