# DoomChess — Product Truth

## Product Overview
**DoomChess** is a mobile-first, vertical reels tactical chess application designed to turn mindless phone doomscrolling into rapid, addictive chess mastery. Instead of passive short-form video feeds, players swipe through an endless stream of curated tactical puzzles with instant tactile execution, haptics, and dynamic rating progression.

## Target Audience & Job To Be Done
- **Primary User**: Chess hobbyists, improvers (600–2000+ Elo), and blitz/bullet players seeking high-frequency tactical pattern recognition in micro-moments (commuting, coffee breaks, bedtime).
- **Core Job**: Eliminate guilt and brainrot from phone browsing by replacing social doomscrolling with focused, rewarding chess puzzles that feel as smooth and effortless as TikTok or Instagram Reels.

## Core Capabilities & Mechanisms
1. **Vertical Puzzle Reels**: Seamless vertical swipe interactions with high-fidelity animations, tactile click-to-move and drag-and-drop piece handling.
2. **Adaptive Elo Rating & 6-Step Placement**:
   - Initial skill baselines: Beginner (600 Elo), Intermediate (1200 Elo), Advanced (1600 Elo).
   - 6-puzzle placement test that calculates true starting tactical strength without quota or ads.
   - Elo updates smoothly on solve/fail with streak multipliers and peak rating tracking.
3. **Sound & Haptics Engine**: Synthesized Web Audio API sound effects (move, capture, check, error, victory) and native device haptic vibration feedback.
4. **Seamless Silent Retry**: Blunders on step $x+1$ preserve completed step $x$ moves with a one-tap clean "Retry" (no distracting toasts or reset friction).
5. **Clean Authentication & Profile**:
   - One-tap Google OAuth and direct credentials login.
   - Custom display pictures (DP) with client-side compression and luxury chess art avatars.
6. **Monetization & Pro Tier**:
   - Free tier daily puzzle allowance.
   - Pro Membership (₹200/month or ₹2,280/year with 5% discount) unlocking unlimited Practice Mode, ad-free experience, and custom themes.

## Platform
- **Type**: Mobile-first Web Application / Progressive Web App (PWA) with responsive desktop support.
- **Tech Stack**: Next.js (App Router), React, Tailwind CSS, Prisma ORM, PostgreSQL, Framer Motion / CSS Transitions, Web Audio API.
