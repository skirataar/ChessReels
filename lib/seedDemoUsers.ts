import prisma from "./prisma";

export async function ensureDemoUsers() {
  const demoUsers = [
    { username: "tactics_pro", displayName: "TacticsPro", avatar: "♛", elo: 1810, streak: 8, peakElo: 1850 },
    { username: "hikaru_fan", displayName: "HikaruFan", avatar: "♞", elo: 1645, streak: 4, peakElo: 1690 },
    { username: "magnus_junior", displayName: "MagnusJr", avatar: "♚", elo: 1420, streak: 2, peakElo: 1480 },
    { username: "chess_rookie", displayName: "ChessRookie", avatar: "♟", elo: 950, streak: 1, peakElo: 990 },
  ];

  try {
    for (const u of demoUsers) {
      await prisma.user.upsert({
        where: { username: u.username },
        update: {},
        create: {
          username: u.username,
          displayName: u.displayName,
          avatar: u.avatar,
          elo: u.elo,
          streak: u.streak,
          peakElo: u.peakElo,
          isCalibrated: true,
          calibrationStep: 6,
        },
      });
    }
  } catch (err) {
    console.warn("Could not seed demo users:", err);
  }
}
