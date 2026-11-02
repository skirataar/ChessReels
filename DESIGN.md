# DoomChess — Design System & Visual Language

## Visual Direction: Dark Luxury & Antique Gold
DoomChess lives at the intersection of high-stakes chess mastery and modern addictive short-form media. The interface rejects generic neon gamer tropes and purple AI gradients in favor of an opulent, bespoke obsidian-and-gold aesthetic.

---

## 1. Color Palette & Surface Tokens

### Core Hues
- **Obsidian Void (Canvas)**: `#0f0e0d` — Deep, distraction-free matte black canvas.
- **Surface Low**: `#161514` — Base background for modals, navbars, and sheets.
- **Surface Elevated (Panels & Cards)**: `#22201e` — Subtle warm walnut charcoal with 1px border.
- **Surface Container High**: `#2b2724` — Interactive hover states and active buttons.

### Brand Accents (Antique Gold)
- **Primary Gold**: `#c29b78` — Warm antique brass/gold, representing rating, prestige, and key CTAs.
- **Gold Radiant / Hover**: `#d8b390` — Elevated hover state for buttons and active board squares.
- **Gold Glow / Shadow**: `rgba(194, 155, 120, 0.20)` — Soft ambient depth for focused elements.

### Text Hierarchy
- **Primary Text**: `#f5f5f5` — High contrast ivory for board move notation, headers, and solve status.
- **Secondary Text**: `#a3a3a3` — Neutral grey for subtitles, timestamps, and secondary info.
- **Muted Text**: `#737373` — Low-contrast indicators, hints, and subtle helper captions.

### Feedback Tones
- **Success (Puzzle Solved)**: `#10b981` (Emerald Green) with emerald ring accent.
- **Error / Blunder**: `#ef4444` (Crimson Rose) with subtle warm shake feedback.

---

## 2. Typography

- **Brand & Display Heading**: Bold, authoritative modern sans / luxury editorial display with tight tracking (`tracking-tight`, `-0.02em`).
- **Body & Controls**: Clean UI sans (Geist / Inter) with `leading-relaxed` for reading comfort.
- **Chess Notation & Numbers**: Monospaced tabular numerals (`font-mono`) for Elo ratings, move timers, and streaks.

---

## 3. Motion & Animation Standards (Emil Kowalski Philosophy)

- **Targeted Transitions**: Never use `transition: all`. Always specify exact properties (`transition: transform 180ms ease-out, opacity 180ms ease-out, background-color 150ms ease-out`).
- **Tactile Active Feedback**: Buttons and interactive board squares depress with `scale(0.97)` on `:active` with 100ms quick-release spring.
- **Modal Entrances**: Modals animate from `scale(0.96), opacity: 0` to `scale(1), opacity: 1` over 220ms with custom cubic bezier (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **Smooth Piece Drag & Snap**: Chess pieces snap with natural physics and spring curves.
- **Restraint Over Noise**: Animate purpose, not presence. Never animate decorative background elements constantly; reserve motion for user actions and rewarding tactical solves.

---

## 4. Strict Quality Floor (Impeccable & Taste-Skill Guardrails)

- ❌ **No Cards Inside Cards**: Single unified surface elevation per interactive unit.
- ❌ **No Gradient Text**: True luxury comes from font weight, letter-spacing, and gold accenting.
- ❌ **No Emojis as Badges**: Emojis in skill tiers or ratings look cheap. Use minimalist vector icons.
- ❌ **No Distracting Eyebrows**: Delete generic kicker tags like `"PREMIUM FEATURE"`; let strong hierarchy speak.
- ❌ **No Generic AI Slop**: Themed browser surfaces (gold text selection, custom dark scrollbar, styled caret).
