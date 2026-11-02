# Chess Reel: QA & Bug Testing Checklist

Use this interactive checklist to test gameplay mechanics, edge cases, mobile UX, and offline reliability. Mark off items with `[x]` as you verify them.

---

## 1. Move Mechanics & Board Interactions

- [x] **Click-to-Move (Tap Selection)**
  - *Action*: Click on any of your pieces.
  - *Expected*: The square glows indigo with a border. Subtle dots appear on reachable empty squares, and red circular rings appear on capturable enemy pieces.
- [x] **Click-to-Move (Execution)**
  - *Action*: Click one of the highlighted destination squares.
  - *Expected*: The piece moves smoothly to that square, and all highlights clear.
- [x] **Deselection on Same Square**
  - *Action*: Click a piece to highlight, then click the same piece again.
  - *Expected*: The square and reachable dots deselect immediately.
- [x] **Piece Switch**
  - *Action*: Click piece A, then click friendly piece B.
  - *Expected*: Selection switches immediately to piece B with newly calculated destination dots.
- [x] **Drag-and-Drop**
  - *Action*: Drag a piece to a valid destination square and release.
  - *Expected*: Piece drops cleanly and move executes.
- [x] **Illegal Chess Rules Rejection**
  - *Action*: Try to move a rook diagonally, move through another piece, or move a pinned piece.
  - *Expected*: Piece snaps back to source square. No sound or Elo penalty (illegal moves are silently blocked).
- [x] **Mobile Scroll Lock (`touch-none`)**
  - *Action*: On a mobile device / touch emulator, drag a piece vertically.
  - *Expected*: The page does not scroll while dragging pieces.
- Cant go to next puzzle, till solved the one displayed.
---

## 2. Puzzle Logic, Celebration & Blunder Retry Loop

- [x] **Legal Move Blunder (Incorrect Solution - No Premature Skip)**
  - *Action*: Make a legal move that is *not* the puzzle solution.
  - *Expected*:
    - Piece snaps back.
    - Low error buzz sound plays.
    - Double vibration haptic triggers on mobile.
    - The chessboard shakes with an animation.
    - Banner displays: `"Incorrect move. Try another!"`.
    - Elo is deducted once (e.g., `-12`).
    - **CRITICAL**: The app does **NOT** switch to the next puzzle—it stays on the current puzzle so you can solve it!
- [x] **Multiple Attempts on Same Puzzle (Single Penalty)**
  - *Action*: Make 3 different wrong moves on the *same* puzzle.
  - *Expected*: Elo is deducted **only on the first blunder** (not penalized 3 times for exploring).
- [x] **Puzzle Solvability After Mistake**
  - *Action*: After making a wrong move, find and play the actual winning move.
  - *Expected*: The board remains interactive. Playing the correct move advances the puzzle without requiring a page reload or card lock.
- [x] **Reset Board Button**
  - *Action*: After making an incorrect attempt, tap the `"Reset Board"` button.
  - *Expected*: Board resets to the position right after the opponent's blunder so you can rethink clearly.
  - Note: Feels useless, since if i make the wrong move the piece snaps back to original postion
  
- [x] **Multi-Move Counter-Replies**
  - *Action*: On a 2+ move puzzle, play the first correct move.
  - *Expected*: The opponent automatically makes their scripted counter-move after a natural 300ms pause.
- [x] **Puzzle Completion (Victory State & Confetti)**
  - *Action*: Complete the final move of the puzzle.
  - *Expected*:
    - Multi-stage **Confetti burst** explodes across the screen.
    - Triumphant ascending harmonic fanfare plays.
    - Celebratory modal displays `"PUZZLE SOLVED!"`, Trophy aura, Rating Gain pill (`+12 Elo`), and Flame Streak pill (`🔥 1 Streak!`).
    - A generous 5-second countdown timer runs on the `"Next Puzzle"` button.
    - Make it 3 seconds
    - Streak is counting +2 fix

- [x] **Review Board (Pause Auto-Advance)**
  - *Action*: On the victory overlay, tap `"Review Board"`.
  - *Expected*:
    - The celebration modal closes, leaving a subtle `"✓ Solved"` badge.
    - The 5-second auto-advance timer **cancels completely**.
    - You can examine the board and analyze the position for as long as you want without being rushed.
    - When ready, tapping `"Next Puzzle"` advances to the next reel.
- [x] **Keyboard Shortcuts (Desktop UX)**
  - *Action*: When a puzzle is solved, press `Space`, `Enter`, or `ArrowRight`.
  - *Expected*: Immediately advances to the next puzzle.


---

## 3. Special Chess Moves

- [x] **Pawn Promotion**
  - *Action*: In a puzzle requiring pawn promotion, push the pawn to the 8th/1st rank.
  - *Expected*: Promotion evaluates correctly against the puzzle move (defaults to Queen if unstated, supports underpromotions).
  - *Verified*: Automated Playwright E2E tested for Queen and Knight underpromotions.
- [x] **En Passant**
  - *Action*: Execute an en passant capture in an endgame/tactics puzzle where applicable.
  - *Expected*: Capturing pawn moves diagonally, and the bypassed opponent pawn is removed from the board.
  - *Verified*: Automated Playwright E2E tested en passant execution and square cleanup.
- [x] **Castling**
  - *Action*: Castle kingside (`O-O`) or queenside (`O-O-O`) when part of the puzzle solution.
  - *Expected*: King moves two squares and Rook hops over the King properly.
  - *Verified*: Automated Playwright E2E tested both White kingside (`e1g1`) and Black queenside (`e8c8`).

---

## 4. Elo Engine & Persistence

- [x] **Adaptive Elo Window**
  - *Action*: Note current user Elo (e.g. 800) and observe puzzle ratings.
  - *Expected*: Puzzles served are consistently within $\pm 150$ of your current Elo.
- [x] **Guest Session Persistence**
  - *Action*: Open Developer Tools (`F12`), check `Application > LocalStorage > chess_reel_guest_id`.
  - *Expected*: A persistent UUID exists.
- [x] **Elo Persistence Across Page Reloads**
  - *Action*: Solve a puzzle to change your Elo (e.g., from 800 to 824), then press `F5` / Refresh.
  - *Expected*: On page reload, the rating displays `824` (does not reset back to 800).
- [x] **PostgreSQL Database Storage**
  - *Action*: Run query `SELECT * FROM "User";` in PostgreSQL.
  - *Expected*: Your `guestId` exists with your updated Elo in the database.
  - *Verified*: Queried local PostgreSQL table `"User"`; verified guest UUID with rating 1197.

---

## 5. Offline Mode & Buffer Queue

- [x] **Offline Buffer Verification**
  - *Action*: In Developer Tools, inspect `LocalStorage > chess_reel_puzzle_queue`.
  - *Expected*: Array of 5 prefetched puzzles is stored in JSON format.
  - *Verified*: High-speed batch prefetching seeds 5 puzzles into `chess_reel_puzzle_queue`.
- [x] **Airplane / Offline Mode**
  - *Action*: In Developer Tools > Network tab, toggle **Offline**.
  - *Expected*:
    - Top banner appears: `⚡ Offline Mode (Playing from Cache)`.
    - Puzzles continue loading and can be solved seamlessly without internet.
  - *Verified*: Tested with Playwright network disconnect (`context.setOffline(true)`).
- [x] **Background Buffer Refill**
  - *Action*: Switch Network back to **Online** and solve 2 puzzles.
  - *Expected*: Buffer queue automatically refills back to 5 puzzles in the background.
  - *Verified*: Tested automatic background replenishment upon reconnecting.

---

## 6. PWA & Mobile UX

- [x] **Manifest & Installation**
  - *Action*: Open Chrome menu on desktop or mobile.
  - *Expected*: "Install Chess Reel" / "Add to Home Screen" option is available.
  - *Verified*: `/manifest.json` served with `display: "standalone"`, icons, and dark background.
- [x] **Full Viewport (`100dvh`)**
  - *Action*: Open on a mobile device or Chrome mobile device emulator (iPhone 14 / Pixel 7).
  - *Expected*: No vertical overflow or awkward scrolling beyond the puzzle card. Bottom buttons sit comfortably above browser bars.
  - *Verified*: Tested on iPhone 14 viewport (390 x 844); no horizontal/vertical overflow.
- [x] **External Lichess Link**
  - *Action*: Tap the external link icon in the puzzle header.
  - *Expected*: Opens the original full Lichess game in a new tab for deeper game analysis.
  - *Verified*: Verified link points to `https://lichess.org/...` with `target="_blank"`.

---

## 7. Resolved Fixes & UI Enhancements
- [x] **Streak incrementing +2 fix**: Resolved duplicate `sendEloResult("win")` call by guarding with idempotent `hasWonRef`. Streak now strictly increments by +1.
- [x] **Auto-advance countdown adjusted to 3s**: Reduced timer from 5 seconds to 3 seconds as requested.
- [x] **Prominent White/Black Turn Indicator**: Upgraded turn circle from 10px to a bold 16px (`w-4 h-4`) glowing indicator with ring and drop shadow.
- [x] **Grey 50% Opacity Move Dots**: Replaced indigo dots with subtle grey indicator dots at 50% opacity (`rgba(148, 163, 184, 0.5)`).
- [x] **Brilliant Move Indicator**: Removed as requested to avoid distracting popups on every move.
- [x] **Batch Prefetch Optimization**: Upgraded `/api/puzzle/random?count=5` to fetch full 5-puzzle buffer in 1 database roundtrip.
- [x] **Swipe Snap-Back Fix**: Resolved bottom-of-screen swipe drag leaving the viewport scrolled down; card now snaps crisply back to center with spring physics and zero scroll drift.
- [x] **Multi-Step Puzzle Progress Preservation (QOL)**: When a mistake occurs on step $x+1$ of a multi-move puzzle, retrying restores the board directly to step $x+1$ with all previous $x$ moves and opponent counter-moves preserved, eliminating tedious move repetition. Also provides an optional "Restart" button to begin from step 1 if desired.
- [x] **Mobile Hydration Mismatch Fix**: Resolved Next.js client-server mismatch on mobile devices by synchronizing DOM structures across client mounts with `hasMounted` guards and `suppressHydrationWarning` on dynamic HUD elements, eliminating the Turbopack recoverable error popup on phones.
- [x] **Puzzle Tagline Inside Board Utility Box**: Centered tactical tag (e.g. `✨ Tactical Alert • Loose Piece`) directly inside the black header bar above the chessboard, leaving piece color exclusively in the bottom tactical bar.
- [x] **Preserved Vertical Breathing Space**: Kept clean vertical breathing room above the board utility bar (`h-2.5 sm:h-3.5`).
- [x] **Custom Display Picture (DP) & Studio Photo Avatars**:
  - Replaced corny emoji avatars across the platform (`Profile & Stats`, `ProfileModal`, `AuthModal`).
  - Implemented custom photo upload (`<input type="file" accept="image/*">`) with automatic client-side 256x256 square compression (~25KB JPEG).
  - Provided 4 aesthetic high-res chess photography presets: Grandmaster, Obsidian Knight, Golden Queen, Cyber King.
  - Full persistence across `localStorage` and PostgreSQL via `PATCH /api/user/account`.
- [x] **Clean Silent Retry Flow**:
  - Removed step number labels from buttons (clean `"Retry"` instead of `"Retry Step X"`).
  - Completely removed the floating pill toast notification (`Saved progress! Retrying Step X`) so users retry smoothly without any disruptive dropdown popups.
- [x] **Strict Authentication & Minimalist Animated Landing Page**:
  - **No Guest Access on Logout or Fresh Visits**: Unauthenticated visitors cannot enter gameplay or stats without logging in.
  - **Complete Logout Session Purge**: Signing out clears `chess_reel_account`, `chess_reel_plan`, `chess_reel_custom_dp`, `chess_reel_preview_guest`, session cookies, and redirects immediately to `/`.
  - **Animated Chess Hero (`AnimatedChessHero.tsx`)**: 3D perspective floating tactical chessboard with smooth knight leap, landing ripple shockwave, golden Queen with sparkles, floating ambient dust motes, and radiant gold aura.
  - **Focused 2-Action Landing Page (`LandingPage.tsx`)**: Removed all pricing tables, feature checklists, and guest preview buttons. Features brand name `ChessReel` directly above two primary buttons: `Continue with Google` and `Log In` (with subtle `Create Account` link).
  - **Bottom Dock Protection**: Hidden for unauthenticated visitors so the landing page remains 100% immersive.
  - **E2E Test Coverage**: Verified with 5 comprehensive tests in `e2e/landing-and-no-guest.spec.ts`
- [x] **Universal OAuth Public Domain Resolution (`lib/authUrl.ts`)**:
  - Eliminates hardcoded `localhost:3000` redirects during Google OAuth authentication.
  - Dynamically extracts public host and protocol from `x-forwarded-host`, `x-forwarded-proto`, and `NEXT_PUBLIC_APP_URL`.
  - Guarantees seamless login redirects when operating over Cloudflare tunnels (`*.trycloudflare.com`), custom domains, or production reverse proxies.
- [x] **Clean Professional Google Auth Dialog (`AuthModal.tsx`)**:
  - Removed all emojis (`🌱`, `⚔️`, `👑`) from the Elo skill baseline selection cards.
  - Changed the primary action button to `"Continue with Google"` (removed technical `"(OAuth)"` label).
  - Streamlined modal header copy from `"via Google OAuth 2.0"` to `"Save your rating, streaks, and progress securely"`.
  - Replaced emojis in account creation with clean, minimalist Lucide icons.
- [x] **Direct 1-Click Google Sign-In Flow**:
  - Removed confusing intermediate popup that asked users to choose their skill baseline/Elo again when clicking 'Continue with Google'.
  - Clicking 'Continue with Google' on either the Landing Page or the Log In modal directly redirects to `/api/auth/google`.
  - Preserves existing accounts and Elo ratings seamlessly without any unwanted signup prompts.
- [x] **Fully Dynamic OAuth Origin Reflection**:
  - Eliminates hardcoded or environment-enforced domain redirects.
  - When accessing via `http://localhost:3000`, Google OAuth redirects strictly back to `http://localhost:3000`.
  - When accessing via Cloudflare tunnel, port-forwarding, or production domains, Google OAuth redirects back to that exact public domain.
  - Round-trips the caller origin through OAuth `state` parameter for guaranteed return fidelity.
- [x] **Persistent Bottom Navigation Dock (`BottomNav.tsx`)**:
  - Fixed issue where the bottom dock vanished whenever users were unauthenticated, logged out, or after Google OAuth redirection.
  - Dock remains permanently mounted and visible across all app views (`/play`, `/`, `/practice`, `/stats`), only hiding on `/admin`.
  - Unauthenticated clicks on 'Practice' or 'Profile' dock tabs gracefully dispatch the sign-in modal rather than leaving the user stranded or hiding navigation.
  - Synced `chess_reel_session` cookie and `account-updated` event dispatch on all Google and password authentication pathways.
- [x] **Arrow Line Drawing & Swipe Isolation (`PuzzleCard.tsx`)**:
  - Fixed bug where right-clicking or dragging on the chessboard to draw tactical lines/arrows inadvertently triggered vertical reel swipe up.
  - Strictly required primary left-click (`e.button === 0`) for desktop drag-to-swipe simulation, allowing right-click arrow drawing to pass directly to `react-chessboard`.
  - Ignored any touch or mouse drag gestures originating inside `[data-testid='chessboard-container']` so all piece moves, square selections, and annotations remain strictly isolated from reel transitions.
  - Added mobile touch arrow drawing support with brand-tailored DoomChess warm gold arrows (`#c29b78`).
  - Preserved fluid reel navigation when swiping outside the chessboard (mission header bar, status bar, and floating swipe cue pill).


