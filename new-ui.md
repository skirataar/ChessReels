<!-- Chess Reel - Active Puzzle (Playing & Dragging) -->
<!DOCTYPE html><html class="dark" lang="en"><head><meta charset="utf-8"><meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport"><meta content="mobile_tab" name="shell-type"><link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"><link href="https://fonts.googleapis.com" rel="preconnect"><link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"><style>@layer base{html,body{width:100vw;margin:0;padding:0;background-color:#0A0A0A;}body{overscroll-behavior-y:none;}.pb-safe{padding-bottom:env(safe-area-inset-bottom,0px);}.pt-safe{padding-top:env(safe-area-inset-top,0px);}main>:first-child{margin-top:0!important;}main>:last-child{margin-bottom:0!important;}}::-webkit-scrollbar{display:none;}</style><script src="https://cdn.tailwindcss.com"></script><script id="tailwind-config">tailwind.config = { darkMode: "class", theme: { extend: { colors: { "on-secondary-fixed": "#001f26", "primary-container": "#10b981", "surface-dim": "#131315", "surface-charcoal": "#121214", "obsidian-base": "#0A0A0A", "surface-elevated": "#18181B", "board-light": "#3D3B38", "on-surface": "#e5e1e4", "surface-tint": "#4edea3", "on-secondary-container": "#00424e", "tertiary-container": "#e29100", "on-error-container": "#ffdad6", "on-primary-fixed-variant": "#005236", "error-container": "#93000a", "on-primary-fixed": "#002113", "on-secondary": "#003640", "primary": "#4edea3", "on-secondary-fixed-variant": "#004e5c", "on-surface-variant": "#bbcabf", "glass-panel": "rgba(39, 39, 42, 0.65)", "inverse-primary": "006c49", "background": "#131315", "on-error": "#690005", "surface-container": "#201f21", "on-tertiary-fixed": "#2a1700", "secondary-fixed": "#acedff", "surface-variant": "#353437", "surface": "#131315", "on-background": "#e5e1e4", "glass-border": "rgba(63, 63, 70, 0.35)", "on-tertiary-fixed-variant": "#653e00", "tertiary": "#ffb95f", "feedback-rose": "#EF4444", "secondary-container": "#03b5d3", "inverse-on-surface": "#303032", "inverse-surface": "#e5e1e4", "surface-container-highest": "#353437", "on-tertiary-container": "#523200", "on-tertiary": "#472a00", "board-dark": "#262421", "primary-fixed": "#6ffbbe", "on-primary": "#003824", "outline-variant": "#3c4a42", "surface-container-low": "#1b1b1d", "surface-container-high": "#2a2a2c", "on-primary-container": "#00422b", "surface-container-lowest": "#0e0e10", "error": "#ffb4ab", "tertiary-fixed": "#ffddb8", "surface-bright": "#39393b", "tertiary-fixed-dim": "#ffb95f", "outline": "#86948a", "primary-fixed-dim": "#4edea3", "secondary": "#4cd7f6", "secondary-fixed-dim": "#4cd7f6" }, borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" }, spacing: { "space-sm": "0.5rem", "space-xs": "0.25rem", "space-xl": "2rem", "space-lg": "1.5rem", "margin": "1rem", "gutter-sm": "0.75rem", "space-md": "1rem", "margin-mobile": "0.75rem", "gutter": "1rem" }, fontFamily: { "label-tag": ["Inter"], "headline-xl-mobile": ["Inter"], "body-lg": ["Inter"], "headline-xl": ["Inter"], "label-numeric-md": ["Inter"], "headline-lg": ["Inter"], "headline-lg-mobile": ["Inter"], "body-md": ["Inter"], "body-sm": ["Inter"], "label-numeric-lg": ["Inter"], "headline-md": ["Inter"] }, fontSize: { "label-tag": ["11px", { "lineHeight": "14px", "letterSpacing": "0.06em", "fontWeight": "700" }], "headline-xl-mobile": ["32px", { "lineHeight": "38px", "letterSpacing": "-0.025em", "fontWeight": "800" }], "body-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "-0.01em", "fontWeight": "400" }], "headline-xl": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.03em", "fontWeight": "800" }], "label-numeric-md": ["16px", { "lineHeight": "20px", "letterSpacing": "-0.01em", "fontWeight": "700" }], "headline-lg": ["28px", { "lineHeight": "34px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "headline-lg-mobile": ["24px", { "lineHeight": "30px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "body-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0em", "fontWeight": "400" }], "body-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.01em", "fontWeight": "400" }], "label-numeric-lg": ["22px", { "lineHeight": "26px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "headline-md": ["20px", { "lineHeight": "26px", "letterSpacing": "-0.015em", "fontWeight": "600" }] } } } };</script></head><body class="bg-obsidian-base font-body-md text-on-surface flex flex-col min-h-screen selection:bg-primary-container selection:text-on-primary-fixed"><header class="fixed top-0 inset-x-0 z-50 bg-obsidian-base/80 backdrop-blur-xl pt-safe"><div class="h-16 px-margin flex items-center justify-between gap-gutter-sm"><div class="flex items-center gap-space-xs"><img alt="Chess Reel Logo" class="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/AEtjO1WBXCPhr93D-ICiOrD7i3yu7g2tkxW1T9d1cbL9n_ghi1Mvk6UJ9rhCNPR6xWRswF6J8g0o4_WHs0_yYCbRREA91S672SJYYTW0hYFRQ2y2gKKHeWC1AmIocGF3XVtX3N8eDd7QwdLvB4i_jcSDQMnL6OpJBzL6W19mVGTwVt6gqBQPTwvsA5vYN3O4NOhlUBOaAlcv3RpWC2MtqZaccfq3VasDqF0XpsgKJjC3U7LG"><span class="font-headline-md text-headline-md tracking-tight text-on-surface hidden sm:inline">Chess Reel</span><span class="font-label-tag text-label-tag uppercase text-on-surface-variant font-bold px-1.5 py-0.5 rounded bg-surface-container-high hidden xs:inline">Feed Reels</span></div><div class="flex items-center gap-space-xs"><div class="flex items-center gap-1 bg-surface-elevated/90 px-2.5 py-1 rounded-full shadow-[0_1px_8px_rgba(0,0,0,0.4)]"><span class="material-symbols-outlined text-primary text-base leading-none">bolt</span><span class="font-label-numeric-md text-label-numeric-md text-primary">1245</span><span class="font-label-tag text-label-tag uppercase text-on-surface-variant">Elo</span></div><div class="flex items-center gap-1 bg-surface-elevated/90 px-2 py-1 rounded-full"><span class="material-symbols-outlined text-tertiary text-base leading-none">local_fire_department</span><span class="font-label-numeric-md text-label-numeric-md text-tertiary">5</span></div><div class="w-2.5 h-2.5 rounded-full bg-primary/20 flex items-center justify-center"><div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div></div><a class="relative flex items-center justify-center rounded-full p-0.5 min-w-[32px] min-h-[32px]" data-path="profile" href="#"><img alt="Profile" class="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhwSfWRMEZLburV6h2jEmdFREU9wn4O7igLSICjZtjG8FyrmqA2SRMoB1AVPJOVUgXQW0dCete_jys_B6e6vVgIEpRCRkSD8t9dtVZU4vPNZkSiC-KxMHRA7EBMEKgzG0hgbDqSKtdUUtOfuZfxqavsrkj26eS-2TVDK_AD2p_7rnjnhq7OAf0hwy2pU1tNYajw0BsZDY6F14r1wgLh1Y6yIovm2qumLbqksrYhgc"></a></div></div></header><main class="flex flex-col relative w-full pt-16 pb-24 bg-obsidian-base min-h-screen"><div class="flex flex-col w-full relative select-none">
<!-- Interactive Reel Canvas Slot -->
<div class="relative w-full flex flex-col items-center justify-between px-margin-mobile pb-space-lg">
<!-- Top Floating Reel HUD / Challenge Context -->
<div class="w-full flex items-center justify-between gap-space-xs mt-space-xs mb-space-sm z-20">
<!-- Player Live Delta Pill -->
<div class="flex items-center gap-1.5 bg-surface-container-high/90 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md">
<span class="material-symbols-outlined text-primary text-base leading-none">bolt</span>
<span class="font-label-numeric-md text-label-numeric-md text-on-surface">1245</span>
<span class="font-label-tag text-label-tag text-primary font-bold">+14</span>
</div>
<!-- Offline/Synced Realtime Mode Badge -->

<!-- Streak & Session Stats -->
<div class="flex items-center gap-1.5">
<div class="flex items-center gap-1 bg-surface-container-high/90 px-3 py-1.5 rounded-full shadow-md backdrop-blur-md">
<span class="material-symbols-outlined text-tertiary text-base leading-none" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
<span class="font-label-numeric-md text-label-numeric-md text-tertiary">5</span>
</div>
<button aria-label="Tactical stats summary" class="flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-high/90 text-on-surface-variant active:scale-95 transition-transform shadow-md" id="statsTrigger">
<span class="material-symbols-outlined text-base">query_stats</span>
</button>
</div>
</div>
<!-- Active Puzzle Mission Brief -->
<div class="w-full flex items-center justify-between mb-space-xs px-1">
<div class="flex items-center gap-2">
<span class="w-2.5 h-2.5 rounded-full bg-on-surface shadow-sm"></span>
<span class="font-headline-md text-headline-md tracking-tight text-on-surface font-semibold">White to move</span>
</div>
<div class="flex items-center gap-1.5 bg-surface-container/60 px-2 py-0.5 rounded-full">
<span class="material-symbols-outlined text-primary text-sm">psychology</span>
<span class="font-label-tag text-label-tag text-on-surface-variant uppercase">Mate in 2</span>
</div>
</div>
<!-- Central Playing Theater + Floating Reel Side Controls -->
<div class="relative w-full max-w-sm flex items-center justify-center my-space-xs">
<!-- Chessboard Container (1:1 Ratio Tournament Dimensions) -->
<div class="relative w-full aspect-square rounded-xl bg-board-dark p-2 shadow-2xl overflow-hidden flex flex-col justify-between">
<!-- Subtle Board Rim Glow on Action -->
<div class="absolute inset-0 pointer-events-none rounded-xl shadow-[inset_0_0_20px_rgba(78,222,163,0.15)]"></div>
<!-- 8x8 Grid Canvas -->
<div class="relative w-full h-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden bg-board-dark" id="boardGrid">
<!-- Rank 8: Black King on g8 (Back rank pressure) -->
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative">
<span class="material-symbols-outlined text-surface-container-lowest text-3xl select-none opacity-85">shield</span>
</div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow-sm" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 80% 100%;"></div></div>
<div class="bg-board-light flex items-center justify-center relative">
<!-- Black King g8 (Target of Fork) -->
<div class="relative flex items-center justify-center"><div class="w-8 h-8 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 0% 100%;"></div><div class="absolute inset-0 rounded-full bg-error-container/30 animate-ping pointer-events-none"></div></div>
</div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<!-- Rank 7: Black Pawns protecting structure -->
<div class="bg-board-dark flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow-sm" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div></div>
<div class="bg-board-light flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow-sm" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative">
<!-- Black Queen d7 (Co-target of Knight fork) -->
<div class="relative flex items-center justify-center"><div class="w-8 h-8 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 20% 100%;"></div><div class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-tertiary"></div></div>
</div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow-sm" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div></div>
<div class="bg-board-dark flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow-sm" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div></div>
<div class="bg-board-light flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow-sm" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div></div>
<!-- Rank 6: Open space -->
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<!-- Rank 5: Square e5 is the Fork Destination square (row 4, col 5 / index file e) -->
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div></div>
<!-- e5 Target Drop Zone: High-delight highlight active -->
<div class="bg-board-dark flex items-center justify-center relative bg-primary-container/20" id="targetSquareE5">
<!-- Pulsing Target Dot Indicator -->
<div class="w-4 h-4 rounded-full bg-primary shadow-[0_0_12px_rgba(78,222,163,0.8)] animate-pulse flex items-center justify-center">
<div class="w-1.5 h-1.5 rounded-full bg-obsidian-base"></div>
</div>
<!-- Target Crosshair Hint -->
<span class="absolute text-[8px] font-label-tag text-primary top-0.5 right-1 opacity-80 uppercase">e5</span>
</div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<!-- Rank 4: Midfield battleground -->
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative">
<!-- White Pawn d4 -->
<div class="w-3.5 h-3.5 rounded-full bg-on-surface shadow-md"></div>
</div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"><div class="w-7 h-7 opacity-30" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 60% 0%;"></div><div class="absolute w-2 h-2 rounded-full bg-primary/40 bottom-1 right-1"></div></div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<!-- Rank 3: Previous square f3 (Origin of the dragging micro-interaction) -->
<div class="bg-board-dark flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div></div>
<div class="bg-board-light flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div></div>
<div class="bg-board-dark flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div></div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<!-- f3 Origin Square Highlight -->
<div class="bg-board-light flex items-center justify-center relative bg-primary-container/15"><div class="w-7 h-7 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div></div>
<div class="bg-board-dark flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div></div>
<div class="bg-board-light flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div></div>
<!-- Rank 2: White pawns -->
<div class="bg-board-light flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 80% 0%;"></div></div>
<div class="bg-board-dark flex items-center justify-center relative">
<div class="w-3.5 h-3.5 rounded-full bg-on-surface shadow-md"></div>
</div>
<div class="bg-board-light flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 40% 0%;"></div></div>
<div class="bg-board-dark flex items-center justify-center relative"><div class="w-8 h-8 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 20% 0%;"></div></div>
<div class="bg-board-light flex items-center justify-center relative"><div class="w-8 h-8 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 0% 0%;"></div></div>
<div class="bg-board-dark flex items-center justify-center relative">
<div class="w-3.5 h-3.5 rounded-full bg-on-surface shadow-md"></div>
</div>
<div class="bg-board-light flex items-center justify-center relative">
<div class="w-3.5 h-3.5 rounded-full bg-on-surface shadow-md"></div>
</div>
<div class="bg-board-dark flex items-center justify-center relative"><div class="w-7 h-7 filter drop-shadow" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 80% 0%;"></div></div>
<!-- Rank 1: White baseline -->
<div class="bg-board-dark flex items-center justify-center relative">
<svg class="w-6 h-6 text-on-surface" fill="currentColor" viewBox="0 0 24 24">
<path d="M5 20h14v-2H5v2zm2-4h10v-3H7v3zm10-5V7h2V4H5v3h2v4l2 1h6l2-1z"></path>
</svg>
</div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative">
<svg class="w-6 h-6 text-on-surface" fill="currentColor" viewBox="0 0 24 24">
<path d="M12 2c-.6 0-1 .4-1 1 0 .2.1.4.2.6L8 8.8c-.8.8-1.3 1.9-1.3 3.1 0 2.2 1.6 4.1 3.8 4.4v1.7H9v2h6v-2h-1.5v-1.7c2.2-.3 3.8-2.2 3.8-4.4 0-1.2-.5-2.3-1.3-3.1L12.8 3.6c.1-.2.2-.4.2-.6 0-.6-.4-1-1-1z"></path>
</svg>
</div>
<div class="bg-board-light flex items-center justify-center relative">
<!-- White Queen d1 -->
<svg class="w-7 h-7 text-on-surface" fill="currentColor" viewBox="0 0 24 24">
<path d="M12 2c.8 0 1.5.7 1.5 1.5S12.8 5 12 5s-1.5-.7-1.5-1.5S11.2 2 12 2zm6 2c.8 0 1.5.7 1.5 1.5S18.8 7 18 7s-1.5-.7-1.5-1.5S17.2 4 18 4zM6 4c.8 0 1.5.7 1.5 1.5S6.8 7 6 7 4.5 6.3 4.5 5.5 5.2 4 6 4zm11 5l-2.5 7h-5L7 9l4 3.5L12 7l1 5.5L17 9zm1 9H6v3h12v-3z"></path>
</svg>
</div>
<div class="bg-board-dark flex items-center justify-center relative">
<!-- White King e1 -->
<svg class="w-7 h-7 text-on-surface" fill="currentColor" viewBox="0 0 24 24">
<path d="M12 2a1 1 0 0 1 1 1v1h2v2h-2v2h2v2h-2v2.1c2.3.5 4 2.5 4 4.9H7c0-2.4 1.7-4.4 4-4.9V10H9V8h2V6H9V4h2V3a1 1 0 0 1 1-1zm6 17H6v3h12v-3z"></path>
</svg>
</div>
<div class="bg-board-light flex items-center justify-center relative"></div>
<div class="bg-board-dark flex items-center justify-center relative"></div>
<div class="bg-board-light flex items-center justify-center relative">
<svg class="w-6 h-6 text-on-surface" fill="currentColor" viewBox="0 0 24 24">
<path d="M5 20h14v-2H5v2zm2-4h10v-3H7v3zm10-5V7h2V4H5v3h2v4l2 1h6l2-1z"></path>
</svg>
</div>
<!-- Micro-interaction Element: Tactile Dragging Piece (White Knight f3 -> e5) -->
<!-- Positioned midway between f3 (col 6, row 6) and e5 (col 5, row 4) with lift transform -->
<div class="absolute z-30 cursor-grab active:cursor-grabbing pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 scale-110 transition-transform duration-75 flex items-center justify-center" id="draggedKnight" style="left: 57%; top: 56%;">
<!-- Emerald Halo Ring + Depth Drop Shadow -->
<div class="relative w-12 h-12 flex items-center justify-center rounded-full bg-obsidian-base/60 backdrop-blur-sm shadow-[0_12px_24px_rgba(0,0,0,0.8),0_0_18px_rgba(78,222,163,0.55)]"><div class="absolute inset-0 rounded-full border-2 border-primary animate-pulse opacity-90"></div><div class="w-9 h-9 filter drop-shadow-md" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-repeat: no-repeat; background-size: 600% 200%; background-position: 60% 0%;"></div></div>
<!-- Dynamic Drag Trajectory Bead Particle -->
<div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary font-label-tag text-[9px] px-1.5 py-0.5 rounded shadow-sm font-bold uppercase tracking-wider">
              Nf3 → Ne5
            </div>
</div>
</div>
<!-- Board File / Rank Labels (Tactile modern subtle indices) -->
<div class="absolute left-2.5 bottom-2.5 pointer-events-none flex gap-1 z-10">
<span class="font-label-tag text-[9px] text-on-surface-variant/40 font-bold">1</span>
</div>
<div class="absolute right-2.5 bottom-2.5 pointer-events-none flex gap-1 z-10">
<span class="font-label-tag text-[9px] text-on-surface-variant/40 font-bold">h</span>
</div>
</div>
<!-- Right Reel Action Stack (TikTok/Reel Paradigm: single thumb zone) -->
<aside class="absolute -right-3 sm:-right-4 flex flex-col items-center gap-space-sm z-30">
<!-- Bookmark / Save Pattern -->
<button aria-label="Save puzzle pattern" class="w-11 h-11 rounded-full bg-glass-panel backdrop-blur-xl flex flex-col items-center justify-center text-on-surface shadow-lg active:scale-90 transition-transform" id="bookmarkBtn">
<span class="material-symbols-outlined text-xl">bookmark</span>
<span class="font-label-tag text-[9px] text-on-surface-variant">Save</span>
</button>
<!-- Sound Haptic Toggle -->
<button aria-label="Toggle piece sound" class="w-11 h-11 rounded-full bg-glass-panel backdrop-blur-xl flex flex-col items-center justify-center text-primary shadow-lg active:scale-90 transition-transform" id="soundToggle">
<span class="material-symbols-outlined text-xl">volume_up</span>
<span class="font-label-tag text-[9px] text-on-surface-variant">SFX</span>
</button>
<!-- Share Tactical Reel Card -->
<button aria-label="Share puzzle card" class="w-11 h-11 rounded-full bg-glass-panel backdrop-blur-xl flex flex-col items-center justify-center text-on-surface shadow-lg active:scale-90 transition-transform" id="shareBtn">
<span class="material-symbols-outlined text-xl">share</span>
<span class="font-label-tag text-[9px] text-on-surface-variant">Share</span>
</button>
<!-- Flip Board Orientation -->
<button aria-label="Flip board" class="w-11 h-11 rounded-full bg-glass-panel backdrop-blur-xl flex flex-col items-center justify-center text-on-surface shadow-lg active:scale-90 transition-transform" id="flipBtn">
<span class="material-symbols-outlined text-xl">swap_vert</span>
<span class="font-label-tag text-[9px] text-on-surface-variant">Flip</span>
</button>
</aside>
</div>
<!-- Below Board HUD: Glassmorphic Tactical Info Card -->
<div class="w-full max-w-sm bg-surface-container/80 backdrop-blur-lg rounded-xl p-space-md shadow-xl flex flex-col gap-space-sm mt-space-xs">
<!-- Meta & Category Row -->
<div class="flex items-center justify-between">
<div class="flex items-center gap-1.5">
<span class="font-body-sm text-body-sm text-on-surface-variant">Puzzle Elo</span>
<span class="font-label-numeric-md text-label-numeric-md text-on-surface font-bold">1250</span>
</div>
<!-- Tactical Pattern Badges -->
<div class="flex items-center gap-1.5">
<span class="bg-primary/15 text-primary font-label-tag text-label-tag px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
            Tactical Fork
          </span>
<span class="bg-surface-bright text-on-surface-variant font-label-tag text-label-tag px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
            Middle Game
          </span>
</div>
</div>
<!-- Multi-step Puzzle Progress Track -->
<div class="flex flex-col gap-1.5">
<div class="flex items-center justify-between text-body-sm font-body-sm">
<span class="text-on-surface font-semibold flex items-center gap-1">
<span class="material-symbols-outlined text-primary text-sm">check_circle</span>
            Step 1 of 2
          </span>
<span class="text-on-surface-variant font-label-tag text-label-tag uppercase">Find the fork</span>
</div>
<!-- Visual Multi-segment Progress Bar -->
<div class="w-full h-1.5 bg-surface-bright rounded-full overflow-hidden flex gap-1">
<!-- Step 1: Active Progress In-flight -->
<div class="h-full bg-primary rounded-full transition-all duration-300" style="width: 50%;"></div>
<!-- Step 2: Pending Next Engine Move -->
<div class="h-full bg-surface-variant rounded-full flex-1"></div>
</div>
</div>
</div>
<!-- Bottom Action Bar: Tactical Solver Controls -->
<div class="w-full max-w-sm flex items-center gap-space-sm mt-space-sm">
<!-- Secondary Hint Button with Outline Styling -->
<button class="flex-1 h-12 rounded-xl bg-surface-container-high/90 active:bg-surface-bright flex items-center justify-center gap-2 text-on-surface shadow-md active:scale-95 transition-all" id="hintButton">
<span class="material-symbols-outlined text-tertiary text-xl">lightbulb</span>
<span class="font-headline-md text-body-md font-semibold">Hint</span>
<span class="bg-tertiary/20 text-tertiary font-label-tag text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">1 Left</span>
</button>
<!-- Next Puzzle Button (Smoothly disabled until solution completes) -->
<button class="flex-1 h-12 rounded-xl bg-surface-container-low text-on-surface-variant/40 flex items-center justify-center gap-2 cursor-not-allowed shadow-none transition-all" disabled="" id="nextPuzzleBtn">
<span class="material-symbols-outlined text-lg">lock</span>
<span class="font-headline-md text-body-md font-semibold">Next Reel</span>
</button>
</div>
<!-- Snap Scroll Invitation Hint -->
<div class="flex flex-col items-center justify-center gap-0.5 mt-space-md text-on-surface-variant/70 animate-bounce">
<span class="font-label-tag text-[10px] uppercase tracking-widest">Swipe up for next reel</span>
<span class="material-symbols-outlined text-base leading-none">keyboard_arrow_down</span>
</div>
</div>
</div>
<script>
  (function initChessReelInteractions() {
    const draggedPiece = document.getElementById('draggedKnight');
    const targetSquare = document.getElementById('targetSquareE5');
    const nextBtn = document.getElementById('nextPuzzleBtn');
    const hintBtn = document.getElementById('hintButton');
    const soundToggle = document.getElementById('soundToggle');

    let isAudioOn = true;
    let isSolved = false;

    // Micro-interaction: Playful touch/click on the active dragged knight to simulate snapping to e5
    if (draggedPiece && targetSquare) {
      draggedPiece.addEventListener('click', () => {
        if (isSolved) return;
        
        // Snap animation
        draggedPiece.style.transition = 'all 240ms cubic-bezier(0.34, 1.56, 0.64, 1)';
        draggedPiece.style.left = '56.2%';
        draggedPiece.style.top = '43.7%';
        draggedPiece.classList.remove('scale-110');
        draggedPiece.classList.add('scale-100');

        // Flash target square with success emerald
        targetSquare.classList.remove('bg-primary-container/20');
        targetSquare.classList.add('bg-primary-container/60');

        // Unlock next reel button with delight
        setTimeout(() => {
          isSolved = true;
          if (nextBtn) {
            nextBtn.removeAttribute('disabled');
            nextBtn.className = 'flex-1 h-12 rounded-xl bg-primary-container text-on-primary-fixed flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all font-bold';
            nextBtn.innerHTML = '<span class="material-symbols-outlined text-lg">arrow_forward</span><span class="font-headline-md text-body-md font-bold">Solved! Next</span>';
          }
        }, 300);
      });
    }

    // Sound toggle state
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        isAudioOn = !isAudioOn;
        const icon = soundToggle.querySelector('.material-symbols-outlined');
        if (icon) {
          icon.textContent = isAudioOn ? 'volume_up' : 'volume_off';
          soundToggle.classList.toggle('text-primary', isAudioOn);
          soundToggle.classList.toggle('text-on-surface-variant', !isAudioOn);
        }
      });
    }

    // Hint trigger
    if (hintBtn) {
      hintBtn.addEventListener('click', () => {
        targetSquare?.classList.add('animate-ping');
        setTimeout(() => {
          targetSquare?.classList.remove('animate-ping');
        }, 800);
      });
    }
  })();
</script></main><nav class="fixed bottom-0 inset-x-0 z-50 pb-safe pointer-events-none" data-active-classes="text-primary bg-surface-bright/40"><div class="mx-auto max-w-sm px-margin pb-space-sm"><div class="pointer-events-auto h-16 rounded-full bg-glass-panel backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] flex items-center justify-around px-space-xs"><a aria-current="page" class="flex flex-col items-center justify-center w-14 h-12 rounded-full transition-colors text-primary bg-surface-bright/40" data-path="feed-reels" href="#"><span class="material-symbols-outlined text-2xl">play_circle</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Reels</span></a><a class="flex flex-col items-center justify-center w-14 h-12 rounded-full text-on-surface-variant hover:text-on-surface transition-colors" data-path="leaderboard" href="#"><span class="material-symbols-outlined text-2xl">leaderboard</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Rank</span></a><a class="flex flex-col items-center justify-center w-14 h-12 rounded-full text-on-surface-variant hover:text-on-surface transition-colors" data-path="profile" href="#"><span class="material-symbols-outlined text-2xl">person</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Profile</span></a></div></div></nav>

</body></html>

<!-- Chess Reel - Failed State (-8 Elo) -->
<!DOCTYPE html><html class="dark" lang="en"><head><meta charset="utf-8"><meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport"><meta content="mobile_tab" name="shell-type"><link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"><link href="https://fonts.googleapis.com" rel="preconnect"><link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"><style>@layer base{html,body{width:100vw;margin:0;padding:0;background-color:#0A0A0A;}body{overscroll-behavior-y:none;}.pb-safe{padding-bottom:env(safe-area-inset-bottom,0px);}.pt-safe{padding-top:env(safe-area-inset-top,0px);}main>:first-child{margin-top:0!important;}main>:last-child{margin-bottom:0!important;}}::-webkit-scrollbar{display:none;}</style><script src="https://cdn.tailwindcss.com"></script><script id="tailwind-config">tailwind.config = { darkMode: "class", theme: { extend: { colors: { "on-secondary-fixed": "#001f26", "primary-container": "#10b981", "surface-dim": "#131315", "surface-charcoal": "#121214", "obsidian-base": "#0A0A0A", "surface-elevated": "#18181B", "board-light": "#3D3B38", "on-surface": "#e5e1e4", "surface-tint": "#4edea3", "on-secondary-container": "#00424e", "tertiary-container": "#e29100", "on-error-container": "#ffdad6", "on-primary-fixed-variant": "#005236", "error-container": "#93000a", "on-primary-fixed": "#002113", "on-secondary": "#003640", "primary": "#4edea3", "on-secondary-fixed-variant": "#004e5c", "on-surface-variant": "#bbcabf", "glass-panel": "rgba(39, 39, 42, 0.65)", "inverse-primary": "006c49", "background": "#131315", "on-error": "#690005", "surface-container": "#201f21", "on-tertiary-fixed": "#2a1700", "secondary-fixed": "#acedff", "surface-variant": "#353437", "surface": "#131315", "on-background": "#e5e1e4", "glass-border": "rgba(63, 63, 70, 0.35)", "on-tertiary-fixed-variant": "#653e00", "tertiary": "#ffb95f", "feedback-rose": "#EF4444", "secondary-container": "#03b5d3", "inverse-on-surface": "#303032", "inverse-surface": "#e5e1e4", "surface-container-highest": "#353437", "on-tertiary-container": "#523200", "on-tertiary": "#472a00", "board-dark": "#262421", "primary-fixed": "#6ffbbe", "on-primary": "#003824", "outline-variant": "#3c4a42", "surface-container-low": "#1b1b1d", "surface-container-high": "#2a2a2c", "on-primary-container": "#00422b", "surface-container-lowest": "#0e0e10", "error": "#ffb4ab", "tertiary-fixed": "#ffddb8", "surface-bright": "#39393b", "tertiary-fixed-dim": "#ffb95f", "outline": "#86948a", "primary-fixed-dim": "#4edea3", "secondary": "#4cd7f6", "secondary-fixed-dim": "#4cd7f6" }, borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" }, spacing: { "space-sm": "0.5rem", "space-xs": "0.25rem", "space-xl": "2rem", "space-lg": "1.5rem", "margin": "1rem", "gutter-sm": "0.75rem", "space-md": "1rem", "margin-mobile": "0.75rem", "gutter": "1rem" }, fontFamily: { "label-tag": ["Inter"], "headline-xl-mobile": ["Inter"], "body-lg": ["Inter"], "headline-xl": ["Inter"], "label-numeric-md": ["Inter"], "headline-lg": ["Inter"], "headline-lg-mobile": ["Inter"], "body-md": ["Inter"], "body-sm": ["Inter"], "label-numeric-lg": ["Inter"], "headline-md": ["Inter"] }, fontSize: { "label-tag": ["11px", { "lineHeight": "14px", "letterSpacing": "0.06em", "fontWeight": "700" }], "headline-xl-mobile": ["32px", { "lineHeight": "38px", "letterSpacing": "-0.025em", "fontWeight": "800" }], "body-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "-0.01em", "fontWeight": "400" }], "headline-xl": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.03em", "fontWeight": "800" }], "label-numeric-md": ["16px", { "lineHeight": "20px", "letterSpacing": "-0.01em", "fontWeight": "700" }], "headline-lg": ["28px", { "lineHeight": "34px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "headline-lg-mobile": ["24px", { "lineHeight": "30px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "body-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0em", "fontWeight": "400" }], "body-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.01em", "fontWeight": "400" }], "label-numeric-lg": ["22px", { "lineHeight": "26px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "headline-md": ["20px", { "lineHeight": "26px", "letterSpacing": "-0.015em", "fontWeight": "600" }] } } } };</script><style>
    body {
      min-height: max(884px, 100dvh);
    }
  </style>
  </head><body class="bg-obsidian-base font-body-md text-on-surface flex flex-col min-h-screen selection:bg-primary-container selection:text-on-primary-fixed"><header class="fixed top-0 inset-x-0 z-50 bg-obsidian-base/80 backdrop-blur-xl pt-safe"><div class="h-16 px-margin flex items-center justify-between gap-gutter-sm"><div class="flex items-center gap-space-xs"><img alt="Chess Reel Logo" class="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/AEtjO1WBXCPhr93D-ICiOrD7i3yu7g2tkxW1T9d1cbL9n_ghi1Mvk6UJ9rhCNPR6xWRswF6J8g0o4_WHs0_yYCbRREA91S672SJYYTW0hYFRQ2y2gKKHeWC1AmIocGF3XVtX3N8eDd7QwdLvB4i_jcSDQMnL6OpJBzL6W19mVGTwVt6gqBQPTwvsA5vYN3O4NOhlUBOaAlcv3RpWC2MtqZaccfq3VasDqF0XpsgKJjC3U7LG"><span class="font-headline-md text-headline-md tracking-tight text-on-surface hidden sm:inline">Chess Reel</span><span class="font-label-tag text-label-tag uppercase text-on-surface-variant font-bold px-1.5 py-0.5 rounded bg-surface-container-high hidden xs:inline">Feed Reels</span></div><div class="flex items-center gap-space-xs"><div class="flex items-center gap-1 bg-surface-elevated/90 px-2.5 py-1 rounded-full shadow-[0_1px_8px_rgba(0,0,0,0.4)]"><span class="material-symbols-outlined text-primary text-base leading-none">bolt</span><span class="font-label-numeric-md text-label-numeric-md text-primary">1245</span><span class="font-label-tag text-label-tag uppercase text-on-surface-variant">Elo</span></div><div class="flex items-center gap-1 bg-surface-elevated/90 px-2 py-1 rounded-full"><span class="material-symbols-outlined text-tertiary text-base leading-none">local_fire_department</span><span class="font-label-numeric-md text-label-numeric-md text-tertiary">5</span></div><div class="w-2.5 h-2.5 rounded-full bg-primary/20 flex items-center justify-center"><div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div></div><a class="relative flex items-center justify-center rounded-full p-0.5 min-w-[32px] min-h-[32px]" data-path="profile" href="#"><img alt="Profile" class="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhwSfWRMEZLburV6h2jEmdFREU9wn4O7igLSICjZtjG8FyrmqA2SRMoB1AVPJOVUgXQW0dCete_jys_B6e6vVgIEpRCRkSD8t9dtVZU4vPNZkSiC-KxMHRA7EBMEKgzG0hgbDqSKtdUUtOfuZfxqavsrkj26eS-2TVDK_AD2p_7rnjnhq7OAf0hwy2pU1tNYajw0BsZDY6F14r1wgLh1Y6yIovm2qumLbqksrYhgc"></a></div></div></header><main class="flex flex-col relative w-full pt-16 pb-24 bg-obsidian-base min-h-screen"><div class="flex flex-col w-full relative select-none">
<!-- Reel Slide Container (Constrained for Vertical Reel Experience) -->
<div class="w-full max-w-md mx-auto px-margin-mobile flex flex-col gap-space-sm pb-space-lg">
<!-- Puzzle Meta & Elo Tier Floating Pill -->
<div class="flex items-center justify-between gap-gutter-sm pt-space-xs">
<div class="flex items-center gap-space-xs bg-surface-elevated/90 px-3 py-1.5 rounded-full shadow-md">
<span class="material-symbols-outlined text-feedback-rose text-base">warning</span>
<span class="font-label-tag text-label-tag text-feedback-rose tracking-wider uppercase">Puzzle #1,842</span>
</div>
<div class="flex items-center gap-space-xs bg-surface-container px-3 py-1.5 rounded-full">
<span class="material-symbols-outlined text-tertiary text-sm">schedule</span>
<span class="font-label-tag text-label-tag text-on-surface-variant uppercase">Time Taken: 4.8s</span>
</div>
<div class="flex items-center gap-space-xs bg-surface-elevated px-2.5 py-1.5 rounded-full">
<span class="material-symbols-outlined text-on-surface-variant text-sm">volume_up</span>
</div>
</div>
<!-- Main Reel Card (Infused with Subtle Rose Red Feedback Glow) -->
<div class="relative w-full rounded-xl bg-surface-charcoal p-space-sm shadow-[0_0_30px_rgba(239,68,68,0.22)] flex flex-col gap-space-sm overflow-hidden">
<!-- Glow ambient gradient backdrop -->
<div class="absolute inset-0 bg-gradient-to-b from-error-container/20 via-transparent to-transparent pointer-events-none"></div>
<!-- Top Banner: Tactical Context & Opponent Move Notation -->
<div class="relative z-10 flex items-center justify-between px-space-xs">
<div class="flex items-center gap-2">
<div class="w-7 h-7 rounded-full bg-board-dark flex items-center justify-center text-on-surface shadow-sm font-label-tag text-label-tag font-bold">
            B
          </div>
<div class="flex flex-col">
<span class="font-body-sm text-body-sm text-on-surface-variant">Opponent</span>
<span class="font-label-numeric-md text-label-numeric-md text-on-surface leading-tight">Stockfish Lvl 5</span>
</div>
</div>
<div class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-highest">
<span class="w-2 h-2 rounded-full bg-feedback-rose animate-ping"></span>
<span class="font-label-tag text-label-tag text-on-surface uppercase font-bold">Black to Move</span>
</div>
</div>
<!-- The 8x8 Chessboard Container (1:1 Ratio) -->
<div class="relative w-full aspect-square rounded-lg overflow-hidden shadow-2xl bg-board-dark">
<!-- 64 Board Squares Grid -->
<div class="w-full h-full grid grid-cols-8 grid-rows-8"><!-- Row 8 -->
<div class="bg-board-light flex items-center justify-center relative">
<span class="font-label-tag text-[9px] absolute top-0.5 left-0.5 text-on-surface-variant/70">8</span>
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 80% 100%;"></div>
</div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 40% 100%;"></div>
</div>
<div class="bg-board-dark flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 20% 100%;"></div>
</div>
<div class="bg-board-light flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 0% 100%;"></div>
</div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 80% 100%;"></div>
</div>
<!-- Row 7 -->
<div class="bg-board-dark flex items-center justify-center relative">
<span class="font-label-tag text-[9px] absolute top-0.5 left-0.5 text-on-surface-variant/70">7</span>
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div>
</div>
<div class="bg-board-light flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div>
</div>
<div class="bg-board-dark flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div>
</div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<!-- F7: CRITICAL BLUNDER TARGET SQUARE -->
<div class="bg-feedback-rose/25 relative flex items-center justify-center shadow-[inset_0_0_16px_rgba(239,68,68,0.7)] animate-pulse">
<!-- Captured/Lost Knight Graphic -->
<div class="w-8 h-8 select-none pointer-events-none drop-shadow-[0_2px_4px_rgba(239,68,68,0.5)]" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 60% 100%;"></div>
<!-- Red 'X' Blunder Indicator Overlay -->
<div class="absolute inset-0 flex items-center justify-center">
<span class="material-symbols-outlined text-feedback-rose text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">close</span>
</div>
<!-- Square Coordinate Label -->
<span class="font-label-tag text-[9px] absolute bottom-0.5 right-0.5 text-feedback-rose font-bold">f7</span>
</div>
<div class="bg-board-dark flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div>
</div>
<div class="bg-board-light flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div>
</div>
<!-- Row 6 -->
<div class="bg-board-light flex items-center justify-center relative"><span class="font-label-tag text-[9px] absolute top-0.5 left-0.5 text-on-surface-variant/70">6</span></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 100%;"></div>
</div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<!-- Row 5 -->
<div class="bg-board-dark flex items-center justify-center relative"><span class="font-label-tag text-[9px] absolute top-0.5 left-0.5 text-on-surface-variant/70">5</span></div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 40% 100%;"></div>
</div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center"></div>
<!-- Row 4 -->
<div class="bg-board-light flex items-center justify-center relative"><span class="font-label-tag text-[9px] absolute top-0.5 left-0.5 text-on-surface-variant/70">4</span></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div>
</div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<!-- Row 3 -->
<div class="bg-board-dark flex items-center justify-center relative"><span class="font-label-tag text-[9px] absolute top-0.5 left-0.5 text-on-surface-variant/70">3</span></div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center"></div>
<div class="bg-board-dark flex items-center justify-center"></div>
<!-- Origin square of the blunder: D6 or G5 Knight jump -->
<div class="bg-error-container/40 relative flex items-center justify-center">
<span class="material-symbols-outlined text-base text-feedback-rose/60">change_history</span>
<span class="font-label-tag text-[8px] absolute bottom-0.5 left-0.5 text-feedback-rose">g5</span>
</div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center"></div>
<!-- Row 2 -->
<div class="bg-board-light flex items-center justify-center relative"><span class="font-label-tag text-[9px] absolute top-0.5 left-0.5 text-on-surface-variant/70">2</span>
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div>
</div>
<div class="bg-board-dark flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div>
</div>
<div class="bg-board-light flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div>
</div>
<div class="bg-board-dark flex items-center justify-center"></div>
<div class="bg-board-light flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div>
</div>
<div class="bg-board-dark flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div>
</div>
<div class="bg-board-light flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div>
</div>
<div class="bg-board-dark flex items-center justify-center">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 100% 0%;"></div>
</div>
<!-- Row 1 -->
<div class="bg-board-dark flex items-center justify-center relative">
<span class="font-label-tag text-[9px] absolute top-0.5 left-0.5 text-on-surface-variant/70">1</span>
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 80% 0%;"></div>
<span class="font-label-tag text-[9px] absolute bottom-0.5 right-0.5 text-on-surface-variant/70">a</span>
</div>
<div class="bg-board-light flex items-center justify-center relative">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 60% 0%;"></div>
<span class="font-label-tag text-[9px] absolute bottom-0.5 right-0.5 text-on-surface-variant/70">b</span>
</div>
<div class="bg-board-dark flex items-center justify-center relative">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 40% 0%;"></div>
<span class="font-label-tag text-[9px] absolute bottom-0.5 right-0.5 text-on-surface-variant/70">c</span>
</div>
<div class="bg-board-light flex items-center justify-center relative">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 20% 0%;"></div>
<span class="font-label-tag text-[9px] absolute bottom-0.5 right-0.5 text-on-surface-variant/70">d</span>
</div>
<div class="bg-board-dark flex items-center justify-center relative">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 0% 0%;"></div>
<span class="font-label-tag text-[9px] absolute bottom-0.5 right-0.5 text-on-surface-variant/70">e</span>
</div>
<div class="bg-board-light flex items-center justify-center relative">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 40% 0%;"></div>
<span class="font-label-tag text-[9px] absolute bottom-0.5 right-0.5 text-on-surface-variant/70">f</span>
</div>
<div class="bg-board-dark flex items-center justify-center relative">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 60% 0%;"></div>
<span class="font-label-tag text-[9px] absolute bottom-0.5 right-0.5 text-on-surface-variant/70">g</span>
</div>
<div class="bg-board-light flex items-center justify-center relative">
<div class="w-8 h-8 select-none pointer-events-none" style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc'); background-repeat: no-repeat; background-size: 600% 200%; background-position: 80% 0%;"></div>
<span class="font-label-tag text-[9px] absolute bottom-0.5 right-0.5 text-on-surface-variant/70">h</span>
</div></div>
<!-- Blunder Vector Path Overlay (Origin g5 to destination f7) -->
<svg class="absolute inset-0 w-full h-full pointer-events-none" fill="none" viewBox="0 0 100 100">
<line opacity="0.85" stroke="#EF4444" stroke-dasharray="3 3" stroke-width="2.5" x1="68" x2="68" y1="68" y2="18"></line>
<polygon fill="#EF4444" points="68,14 64,22 72,22"></polygon>
</svg>
<!-- Right Action Rail (Vertical Reel Shortcut stack) -->
<div class="absolute right-2 top-2 flex flex-col gap-2 z-20">
<button class="w-10 h-10 rounded-full bg-glass-panel backdrop-blur-md flex flex-col items-center justify-center text-on-surface active:scale-95 transition-transform shadow-lg" title="Bookmark Puzzle" type="button">
<span class="material-symbols-outlined text-lg">bookmark</span>
</button>
<button class="w-10 h-10 rounded-full bg-glass-panel backdrop-blur-md flex flex-col items-center justify-center text-on-surface active:scale-95 transition-transform shadow-lg" title="Share Replay" type="button">
<span class="material-symbols-outlined text-lg">share</span>
</button>
<button class="w-10 h-10 rounded-full bg-glass-panel backdrop-blur-md flex flex-col items-center justify-center text-on-surface active:scale-95 transition-transform shadow-lg" title="Puzzle Analysis Engine" type="button">
<span class="material-symbols-outlined text-lg">query_stats</span>
</button>
</div>
</div>
<!-- Puzzle Info Bar (Under Board) -->
<div class="flex items-center justify-between px-space-xs pt-1 text-on-surface-variant">
<div class="flex items-center gap-1.5">
<span class="material-symbols-outlined text-base text-tertiary">alt_route</span>
<span class="font-body-sm text-body-sm text-on-surface">Missed Opportunity • Defending King</span>
</div>
<div class="flex items-center gap-1 bg-surface-container-high px-2 py-0.5 rounded text-on-surface-variant font-label-tag text-label-tag">
<span class="">FEN</span>
</div>
</div>
</div>
<!-- Prominent Error Overlay Banner: Translucent Dark Badge -->
<div class="w-full bg-surface-charcoal/95 backdrop-blur-xl rounded-xl p-space-md shadow-2xl flex flex-col gap-space-sm relative overflow-hidden">
<!-- Glow rim on banner -->
<div class="absolute -top-10 -right-10 w-28 h-28 bg-feedback-rose/15 rounded-full blur-2xl pointer-events-none"></div>
<!-- Header: Blunder Indicator & Animated Elo Counter Loss -->
<div class="flex items-center justify-between">
<div class="flex items-center gap-2">
<div class="w-8 h-8 rounded-full bg-feedback-rose/20 flex items-center justify-center text-feedback-rose">
<span class="material-symbols-outlined text-xl font-bold">cancel</span>
</div>
<div>
<div class="flex items-center gap-1.5">
<span class="font-headline-md text-headline-md text-feedback-rose">Blunder</span>
<span class="font-label-tag text-label-tag uppercase px-1.5 py-0.5 rounded bg-feedback-rose/20 text-feedback-rose">Inaccuracy</span>
</div>
</div>
</div>
<!-- Elo Loss Display with Rolling Value Transition -->
<div class="flex items-center gap-1.5 bg-surface-container px-3 py-1 rounded-full">
<span class="font-label-numeric-md text-label-numeric-md text-feedback-rose font-bold">-8 Elo</span>
<div class="flex items-center text-on-surface-variant font-body-sm text-body-sm">
<span class="">1245</span>
<span class="material-symbols-outlined text-xs mx-0.5 text-feedback-rose">arrow_forward</span>
<span class="font-label-numeric-md text-label-numeric-md text-on-surface font-bold" id="elo-counter">1237</span>
</div>
</div>
</div>
<!-- Coach Tip Card -->
<div class="bg-surface-elevated rounded-lg p-space-sm flex items-start gap-2.5">
<div class="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
<span class="material-symbols-outlined text-tertiary text-lg">smart_toy</span>
</div>
<div class="flex flex-col min-w-0">
<div class="flex items-center justify-between">
<span class="font-label-tag text-label-tag text-tertiary uppercase">Coach Analysis</span>
<span class="font-body-sm text-body-sm text-on-surface-variant">Depth 22</span>
</div>
<p class="font-body-md text-body-md text-on-surface mt-0.5 leading-snug">
<span class="font-bold text-feedback-rose">Knight was unprotected on f7!</span> White's Bishop on c4 easily punished the fork before Black could castle safely.
          </p>
</div>
</div>
<!-- Tactile Micro-Progress Streak Status -->
<div class="flex items-center justify-between pt-0.5 px-0.5">
<div class="flex items-center gap-1 text-on-surface-variant font-body-sm text-body-sm">
<span class="material-symbols-outlined text-feedback-rose text-base">heart_broken</span>
<span class="">Daily streak reset to 0</span>
</div>
<div class="flex items-center gap-1">
<span class="w-2 h-2 rounded-full bg-surface-container-high"></span>
<span class="w-2 h-2 rounded-full bg-surface-container-high"></span>
<span class="w-2 h-2 rounded-full bg-feedback-rose animate-ping"></span>
</div>
</div>
</div>
<!-- Bottom Action Area -->
<div class="flex flex-col gap-space-xs mt-space-xs">
<!-- Side-by-Side Dual Buttons -->
<div class="grid grid-cols-2 gap-gutter-sm w-full">
<!-- Secondary Glass Action: Retry Puzzle -->
<button class="h-12 rounded-xl bg-glass-panel active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-on-surface shadow-md hover:bg-surface-elevated" id="retry-btn" type="button">
<span class="material-symbols-outlined text-xl text-primary animate-spin" style="animation-duration: 4s;">replay</span>
<span class="font-headline-md text-body-lg font-semibold">Retry Move</span>
</button>
<!-- Primary Emerald Action: Next Puzzle -->
<button class="h-12 rounded-xl bg-primary active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-on-primary shadow-[0_0_20px_rgba(78,222,163,0.3)]" id="next-btn" type="button">
<span class="font-headline-md text-body-lg font-bold">Next Reel</span>
<span class="material-symbols-outlined text-xl">arrow_forward</span>
</button>
</div>
<!-- Discreet Helper Button: View Solution -->
<button class="w-full py-2.5 flex items-center justify-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors active:opacity-75" id="solution-toggle" type="button">
<span class="material-symbols-outlined text-lg text-tertiary">lightbulb</span>
<span class="font-body-md text-body-md font-semibold text-on-surface-variant">View Best Line (1... Re8 2. d4)</span>
</button>
<!-- Solution Drawer Panel (Initially subtle/collapsible) -->
<div class="hidden bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-1.5 transition-all" id="solution-drawer">
<div class="flex items-center justify-between text-on-surface-variant">
<span class="font-label-tag text-label-tag uppercase text-primary">Engine Evaluation</span>
<span class="font-label-numeric-md text-body-sm text-primary">+3.4 (Winning)</span>
</div>
<p class="font-body-sm text-body-sm text-on-surface leading-normal">
          Instead of <span class="text-feedback-rose font-bold">Nxf7?</span>, play <span class="text-primary font-bold">1... Re8</span> pinning the central file, then prepare <span class="font-semibold text-on-surface">d5</span> counter-strike.
        </p>
</div>
</div>
</div>
</div>
<script>
  // Simple micro-interactions for tactile retry & feedback states
  (function() {
    const retryBtn = document.getElementById('retry-btn');
    const nextBtn = document.getElementById('next-btn');
    const solutionToggle = document.getElementById('solution-toggle');
    const solutionDrawer = document.getElementById('solution-drawer');
    const eloCounter = document.getElementById('elo-counter');

    if (solutionToggle && solutionDrawer) {
      solutionToggle.addEventListener('click', () => {
        const isHidden = solutionDrawer.classList.contains('hidden');
        if (isHidden) {
          solutionDrawer.classList.remove('hidden');
          solutionToggle.querySelector('span:last-child').textContent = 'Hide Solution Line';
        } else {
          solutionDrawer.classList.add('hidden');
          solutionToggle.querySelector('span:last-child').textContent = 'View Best Line (1... Re8 2. d4)';
        }
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        retryBtn.classList.add('opacity-75');
        setTimeout(() => {
          retryBtn.classList.remove('opacity-75');
          // Visually shake the red blunder square to indicate board readiness
          const blunderSq = document.querySelector('.bg-feedback-rose\\/25');
          if (blunderSq) {
            blunderSq.classList.add('scale-105');
            setTimeout(() => blunderSq.classList.remove('scale-105'), 200);
          }
        }, 150);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        nextBtn.classList.add('scale-95');
        setTimeout(() => nextBtn.classList.remove('scale-95'), 120);
      });
    }
  })();
</script></main><nav class="fixed bottom-0 inset-x-0 z-50 pb-safe pointer-events-none" data-active-classes="text-primary bg-surface-bright/40"><div class="mx-auto max-w-sm px-margin pb-space-sm"><div class="pointer-events-auto h-16 rounded-full bg-glass-panel backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] flex items-center justify-around px-space-xs"><a aria-current="page" class="flex flex-col items-center justify-center w-14 h-12 rounded-full transition-colors text-primary bg-surface-bright/40" data-path="feed-reels" href="#"><span class="material-symbols-outlined text-2xl">play_circle</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Reels</span></a><a class="flex flex-col items-center justify-center w-14 h-12 rounded-full text-on-surface-variant hover:text-on-surface transition-colors" data-path="leaderboard" href="#"><span class="material-symbols-outlined text-2xl">leaderboard</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Rank</span></a><a class="flex flex-col items-center justify-center w-14 h-12 rounded-full text-on-surface-variant hover:text-on-surface transition-colors" data-path="profile" href="#"><span class="material-symbols-outlined text-2xl">person</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Profile</span></a></div></div></nav>

</body></html>

<!-- Chess Reel - Solved State (+12 Elo) -->
<!DOCTYPE html><html class="dark" lang="en"><svg class="inline-defs-container" aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden"></svg><head><meta charset="utf-8"><meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport"><meta content="mobile_tab" name="shell-type"><link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"><link href="https://fonts.googleapis.com" rel="preconnect"><link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"><style>@layer base{html,body{width:100vw;margin:0;padding:0;background-color:#0A0A0A;}body{overscroll-behavior-y:none;}.pb-safe{padding-bottom:env(safe-area-inset-bottom,0px);}.pt-safe{padding-top:env(safe-area-inset-top,0px);}main>:first-child{margin-top:0!important;}main>:last-child{margin-bottom:0!important;}}::-webkit-scrollbar{display:none;}</style><script src="https://cdn.tailwindcss.com"></script><script id="tailwind-config">tailwind.config = { darkMode: "class", theme: { extend: { colors: { "on-secondary-fixed": "#001f26", "primary-container": "#10b981", "surface-dim": "#131315", "surface-charcoal": "#121214", "obsidian-base": "#0A0A0A", "surface-elevated": "#18181B", "board-light": "#3D3B38", "on-surface": "#e5e1e4", "surface-tint": "#4edea3", "on-secondary-container": "#00424e", "tertiary-container": "#e29100", "on-error-container": "#ffdad6", "on-primary-fixed-variant": "#005236", "error-container": "#93000a", "on-primary-fixed": "#002113", "on-secondary": "#003640", "primary": "#4edea3", "on-secondary-fixed-variant": "#004e5c", "on-surface-variant": "#bbcabf", "glass-panel": "rgba(39, 39, 42, 0.65)", "inverse-primary": "006c49", "background": "#131315", "on-error": "#690005", "surface-container": "#201f21", "on-tertiary-fixed": "#2a1700", "secondary-fixed": "#acedff", "surface-variant": "#353437", "surface": "#131315", "on-background": "#e5e1e4", "glass-border": "rgba(63, 63, 70, 0.35)", "on-tertiary-fixed-variant": "#653e00", "tertiary": "#ffb95f", "feedback-rose": "#EF4444", "secondary-container": "#03b5d3", "inverse-on-surface": "#303032", "inverse-surface": "#e5e1e4", "surface-container-highest": "#353437", "on-tertiary-container": "#523200", "on-tertiary": "#472a00", "board-dark": "#262421", "primary-fixed": "#6ffbbe", "on-primary": "#003824", "outline-variant": "#3c4a42", "surface-container-low": "#1b1b1d", "surface-container-high": "#2a2a2c", "on-primary-container": "#00422b", "surface-container-lowest": "#0e0e10", "error": "#ffb4ab", "tertiary-fixed": "#ffddb8", "surface-bright": "#39393b", "tertiary-fixed-dim": "#ffb95f", "outline": "#86948a", "primary-fixed-dim": "#4edea3", "secondary": "#4cd7f6", "secondary-fixed-dim": "#4cd7f6" }, borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" }, spacing: { "space-sm": "0.5rem", "space-xs": "0.25rem", "space-xl": "2rem", "space-lg": "1.5rem", "margin": "1rem", "gutter-sm": "0.75rem", "space-md": "1rem", "margin-mobile": "0.75rem", "gutter": "1rem" }, fontFamily: { "label-tag": ["Inter"], "headline-xl-mobile": ["Inter"], "body-lg": ["Inter"], "headline-xl": ["Inter"], "label-numeric-md": ["Inter"], "headline-lg": ["Inter"], "headline-lg-mobile": ["Inter"], "body-md": ["Inter"], "body-sm": ["Inter"], "label-numeric-lg": ["Inter"], "headline-md": ["Inter"] }, fontSize: { "label-tag": ["11px", { "lineHeight": "14px", "letterSpacing": "0.06em", "fontWeight": "700" }], "headline-xl-mobile": ["32px", { "lineHeight": "38px", "letterSpacing": "-0.025em", "fontWeight": "800" }], "body-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "-0.01em", "fontWeight": "400" }], "headline-xl": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.03em", "fontWeight": "800" }], "label-numeric-md": ["16px", { "lineHeight": "20px", "letterSpacing": "-0.01em", "fontWeight": "700" }], "headline-lg": ["28px", { "lineHeight": "34px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "headline-lg-mobile": ["24px", { "lineHeight": "30px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "body-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0em", "fontWeight": "400" }], "body-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.01em", "fontWeight": "400" }], "label-numeric-lg": ["22px", { "lineHeight": "26px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "headline-md": ["20px", { "lineHeight": "26px", "letterSpacing": "-0.015em", "fontWeight": "600" }] } } } };</script></head><body class="bg-obsidian-base font-body-md text-on-surface flex flex-col min-h-screen selection:bg-primary-container selection:text-on-primary-fixed"><header class="fixed top-0 inset-x-0 z-50 bg-obsidian-base/80 backdrop-blur-xl pt-safe"><div class="h-16 px-margin flex items-center justify-between gap-gutter-sm"><div class="flex items-center gap-space-xs"><img alt="Chess Reel Logo" class="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/AEtjO1WBXCPhr93D-ICiOrD7i3yu7g2tkxW1T9d1cbL9n_ghi1Mvk6UJ9rhCNPR6xWRswF6J8g0o4_WHs0_yYCbRREA91S672SJYYTW0hYFRQ2y2gKKHeWC1AmIocGF3XVtX3N8eDd7QwdLvB4i_jcSDQMnL6OpJBzL6W19mVGTwVt6gqBQPTwvsA5vYN3O4NOhlUBOaAlcv3RpWC2MtqZaccfq3VasDqF0XpsgKJjC3U7LG"><span class="font-headline-md text-headline-md tracking-tight text-on-surface hidden sm:inline">Chess Reel</span><span class="font-label-tag text-label-tag uppercase text-on-surface-variant font-bold px-1.5 py-0.5 rounded bg-surface-container-high hidden xs:inline">Feed Reels</span></div><div class="flex items-center gap-space-xs"><div class="flex items-center gap-1 bg-surface-elevated/90 px-2.5 py-1 rounded-full shadow-[0_1px_8px_rgba(0,0,0,0.4)]"><span class="material-symbols-outlined text-primary text-base leading-none">bolt</span><span class="font-label-numeric-md text-label-numeric-md text-primary">1245</span><span class="font-label-tag text-label-tag uppercase text-on-surface-variant">Elo</span></div><div class="flex items-center gap-1 bg-surface-elevated/90 px-2 py-1 rounded-full"><span class="material-symbols-outlined text-tertiary text-base leading-none">local_fire_department</span><span class="font-label-numeric-md text-label-numeric-md text-tertiary">5</span></div><div class="w-2.5 h-2.5 rounded-full bg-primary/20 flex items-center justify-center"><div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div></div><a class="relative flex items-center justify-center rounded-full p-0.5 min-w-[32px] min-h-[32px]" data-path="profile" href="#"><img alt="Profile" class="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhwSfWRMEZLburV6h2jEmdFREU9wn4O7igLSICjZtjG8FyrmqA2SRMoB1AVPJOVUgXQW0dCete_jys_B6e6vVgIEpRCRkSD8t9dtVZU4vPNZkSiC-KxMHRA7EBMEKgzG0hgbDqSKtdUUtOfuZfxqavsrkj26eS-2TVDK_AD2p_7rnjnhq7OAf0hwy2pU1tNYajw0BsZDY6F14r1wgLh1Y6yIovm2qumLbqksrYhgc"></a></div></div></header><main class="flex flex-col relative w-full pt-16 pb-24 bg-obsidian-base min-h-screen"><div class="flex flex-col w-full relative select-none overflow-hidden pb-6">
<!-- Dynamic Particle Canvas for Celebration Sparks -->
<canvas class="pointer-events-none absolute inset-0 z-30 w-full h-full opacity-70" id="sparks-canvas" width="390" height="728"></canvas>
<!-- Ambient Victory Flare Background -->
<div class="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-primary/15 rounded-full blur-3xl"></div>
<!-- Top Context & Live Streak HUD -->
<div class="flex items-center justify-between px-margin py-space-xs z-20">
<div class="flex items-center gap-space-xs">
<span class="inline-flex items-center gap-1 bg-surface-container-high px-2 py-0.5 rounded-full">
<span class="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
<span class="font-label-tag text-label-tag uppercase text-primary font-bold">Solved</span>
</span>
<span class="font-label-tag text-label-tag uppercase text-on-surface-variant font-semibold">Tactic #4,812</span>
</div>
<!-- Streak Multiplier Pill with amber flame glow -->
<div class="flex items-center gap-1 bg-surface-elevated px-2.5 py-1 rounded-full shadow-[0_0_16px_rgba(245,158,11,0.25)]">
<span class="material-symbols-outlined text-tertiary text-base leading-none" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
<span class="font-label-numeric-md text-label-numeric-md text-tertiary font-bold">6 in a row!</span>
<span class="font-label-tag text-label-tag text-tertiary-fixed font-bold bg-surface-charcoal px-1.5 py-0.2 rounded-full">+1.2x</span>
</div>
</div>
<!-- Main Puzzle Container with Emerald Radiance -->
<div class="relative px-margin-mobile mt-space-xs z-20">
<div class="relative rounded-xl overflow-hidden bg-surface-charcoal p-2 shadow-[0_0_35px_rgba(16,185,129,0.35)] transition-all duration-500">
<!-- Top Metas inside Card -->
<div class="flex items-center justify-between px-2 pt-1 pb-2">
<div class="flex items-center gap-2">
<span class="flex items-center justify-center w-5 h-5 rounded-full bg-primary-fixed text-on-primary font-label-tag text-[10px] font-bold">W</span>
<span class="font-body-sm text-body-sm text-on-surface font-semibold">Royal Fork Checkmate</span>
</div>
<div class="flex items-center gap-1.5">
<span class="font-label-tag text-label-tag text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded">RATING 1680</span>
</div>
</div>
<!-- Chessboard 1:1 Aspect Container -->
<div class="relative w-full aspect-square rounded-lg overflow-hidden bg-board-dark shadow-inner">
<!-- 8x8 Board Grid -->
<div class="grid grid-cols-8 grid-rows-8 w-full h-full">
<!-- Row 8 (a8-h8) -->
<div class="bg-board-light flex items-start p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">8</span></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark relative flex items-center justify-center">
<!-- Black King on h8 (Checkmated) -->
<div class="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-size: 600% 200%; background-position: 0% 100%; background-repeat: no-repeat;"></div>
<div class="absolute inset-0 bg-feedback-rose/25 animate-pulse rounded"></div>
</div>
<!-- Row 7 (a7-h7) -->
<div class="bg-board-dark flex items-start p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">7</span></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light relative flex items-center justify-center">
<!-- Black Pawn on f7 -->
<div class="w-7 h-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-size: 600% 200%; background-position: 100% 100%; background-repeat: no-repeat;"></div>
</div>
<div class="bg-board-dark relative flex items-center justify-center">
<!-- Black Pawn on g7 -->
<div class="w-7 h-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-size: 600% 200%; background-position: 100% 100%; background-repeat: no-repeat;"></div>
</div>
<div class="bg-board-light"></div>
<!-- Row 6 (a6-h6) -->
<div class="bg-board-light flex items-start p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">6</span></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark relative flex items-center justify-center">
<!-- Black Queen on d8 forked/trapped nearby d6 -->
<div class="w-8 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-size: 600% 200%; background-position: 20% 100%; background-repeat: no-repeat;"></div>
</div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<!-- Row 5 (a5-h5) -->
<div class="bg-board-dark flex items-start p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">5</span></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark relative flex items-center justify-center">
<!-- Black Rook on c5 -->
<div class="w-7 h-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-size: 600% 200%; background-position: 80% 100%; background-repeat: no-repeat;"></div>
</div>
<div class="bg-board-light"></div>
<!-- Square e5: Destination Square Highlight (Hero Move) -->
<div class="bg-board-dark relative flex items-center justify-center shadow-[inset_0_0_18px_rgba(78,222,163,0.8)]">
<div class="absolute inset-0 bg-primary/30"></div>
<!-- Winning White Knight on e5 -->
<div class="w-9 h-9 drop-shadow-[0_0_12px_rgba(78,222,163,0.9)] transform -rotate-12 scale-110 transition-transform z-10" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-size: 600% 200%; background-position: 60% 0%; background-repeat: no-repeat;"></div>
<!-- Shockwave ripple -->
<div class="absolute inset-1 rounded-full border-2 border-primary/60 animate-ping pointer-events-none"></div>
</div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<!-- Row 4 (a4-h4) -->
<div class="bg-board-light flex items-start p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">4</span></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<!-- Row 3 (a3-h3) -->
<div class="bg-board-dark flex items-start p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">3</span></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<!-- Origin square c3: Light trail origin with wash -->
<div class="bg-board-light relative flex items-center justify-center">
<div class="absolute inset-0 bg-primary/20"></div>
<div class="w-3 h-3 rounded-full bg-primary/40"></div>
</div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<!-- Row 2 (a2-h2) -->
<div class="bg-board-light flex items-start p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">2</span></div>
<div class="bg-board-dark relative flex items-center justify-center">
<!-- White Pawn on b2 -->
<div class="w-7 h-7 drop-shadow-[0_0_6px_rgba(78,222,163,0.6)]" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-size: 600% 200%; background-position: 100% 0%; background-repeat: no-repeat;"></div>
</div>
<div class="bg-board-light"></div>
<div class="bg-board-dark"></div>
<div class="bg-board-light"></div>
<div class="bg-board-dark relative flex items-center justify-center">
<!-- White Pawn on f2 -->
<div class="w-7 h-7 drop-shadow-[0_0_6px_rgba(78,222,163,0.6)]" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-size: 600% 200%; background-position: 100% 0%; background-repeat: no-repeat;"></div>
</div>
<div class="bg-board-light relative flex items-center justify-center">
<!-- White Pawn on g2 -->
<div class="w-7 h-7 drop-shadow-[0_0_6px_rgba(78,222,163,0.6)]" style="background-image: url(&quot;https://lh3.googleusercontent.com/aida-public/AB6AXuD_VVaFQi45XtdjzpcV3sDwIVTICG2Zop1fPKpANILdqEKN2d4hr3rtSrkHdxSXS41hh-lqRKJ0lgHgGqq8_Omqnyv439G_-dcVoPc7GUOLnC5KCxk-Clql1h1Qh8VvwXl8u74XNz6aYVJlohubF5UR8xAB8J-ymR9H8t1U96mhM5MPYA4VEbciBOztYULAzACVE15wUgMAvfUzo4lYfdUypSnxUq3KGrSM5Qz9h9S9tDY9Su2Aakyc&quot;); background-size: 600% 200%; background-position: 100% 0%; background-repeat: no-repeat;"></div>
</div>
<div class="bg-board-dark"></div>
<!-- Row 1 (a1-h1) -->
<div class="bg-board-dark flex items-start justify-between p-0.5">
<span class="font-label-tag text-[9px] text-on-surface-variant/40">1</span>
<span class="font-label-tag text-[9px] text-on-surface-variant/40 self-end">a</span>
</div>
<div class="bg-board-light flex items-end p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">b</span></div>
<div class="bg-board-dark flex items-end p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">c</span></div>
<div class="bg-board-light flex items-end p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">d</span></div>
<div class="bg-board-dark flex items-end p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">e</span></div>
<div class="bg-board-light flex items-end p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">f</span></div>
<div class="bg-board-dark flex items-end p-0.5"><span class="font-label-tag text-[9px] text-on-surface-variant/40">g</span></div>
<div class="bg-board-light flex items-end justify-between p-0.5">
<div class="w-1"></div>
<span class="font-label-tag text-[9px] text-on-surface-variant/40">h</span>
</div>
</div>
<!-- Move Vector Arrow (c3 -> e5) Glowing Green Line -->
<svg class="pointer-events-none absolute inset-0 w-full h-full z-10" fill="none" viewBox="0 0 100 100">
<defs>
<filter height="140%" id="glow" width="140%" x="-20%" y="-20%">
<feDropShadow dx="0" dy="0" flood-color="#4edea3" flood-opacity="0.9" stdDeviation="1.5"></feDropShadow>
</filter>
<marker id="arrow" markerHeight="6" markerWidth="6" orient="auto-start-reverse" refX="6" refY="5" viewBox="0 0 10 10">
<path d="M 0 1 L 8 5 L 0 9 z" fill="#4edea3"></path>
</marker>
</defs>
<!-- Curved dynamic tactical Knight vector -->
<path d="M 43.75 68.75 Q 43.75 43.75 54.5 45" filter="url(#glow)" marker-end="url(#arrow)" stroke="#4edea3" stroke-dasharray="1 0" stroke-linecap="round" stroke-width="2.5"></path>
</svg>
<!-- Right Side Vertical Reel HUD (Quick Reaction Actions) -->
<div class="absolute right-2 top-2 flex flex-col items-center gap-2.5 z-20">
<button aria-label="Bookmarked" class="flex items-center justify-center w-10 h-10 rounded-full bg-glass-panel backdrop-blur-md shadow-md text-primary active:scale-90 transition-transform" type="button">
<span class="material-symbols-outlined text-xl" style="font-variation-settings: 'FILL' 1;">bookmark</span>
</button>
<button aria-label="Share Solution" class="flex items-center justify-center w-10 h-10 rounded-full bg-glass-panel backdrop-blur-md shadow-md text-on-surface hover:text-primary active:scale-90 transition-transform" type="button">
<span class="material-symbols-outlined text-xl">share</span>
</button>
<button aria-label="Engine Evaluation" class="flex items-center justify-center w-10 h-10 rounded-full bg-glass-panel backdrop-blur-md shadow-md text-on-surface active:scale-90 transition-transform" type="button">
<span class="material-symbols-outlined text-xl">psychology</span>
</button>
</div>
<!-- Floating Dynamic Celebration Overlay (Badge & Elo Surge) -->
<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-20">
<!-- Animated Checkmark Core -->
<div class="relative flex items-center justify-center w-20 h-20 rounded-full bg-obsidian-base/85 backdrop-blur-xl shadow-[0_0_35px_rgba(78,222,163,0.7)] animate-bounce mb-2">
<div class="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
<span class="material-symbols-outlined text-primary text-[50px] leading-none" style="font-variation-settings: 'FILL' 1, 'wght' 700;">check_circle</span>
</div>
<!-- Rating Delta Bump Card -->
<div class="flex items-center gap-2 bg-surface-elevated/95 px-4 py-1.5 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.8)]">
<span class="material-symbols-outlined text-primary text-sm">arrow_upward</span>
<span class="font-label-numeric-lg text-label-numeric-lg text-primary font-extrabold tracking-tight">+12 Elo</span>
<div class="w-px h-3.5 bg-surface-variant"></div>
<div class="flex items-center gap-1">
<span class="font-body-sm text-body-sm text-on-surface-variant line-through">1245</span>
<span class="material-symbols-outlined text-xs text-on-surface-variant">arrow_forward</span>
<span class="font-label-numeric-md text-label-numeric-md text-on-surface font-bold text-primary">1257</span>
</div>
</div>
</div>
</div>
<!-- Puzzle Info Bar with 100% Glowing Progress -->
<div class="px-2 pt-3 pb-1">
<!-- Progress Bar (Full 100% Victory) -->
<div class="relative w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden mb-2.5">
<div class="absolute inset-y-0 left-0 w-full bg-primary rounded-full shadow-[0_0_12px_rgba(78,222,163,0.9)]"></div>
</div>
<!-- Stats Metric Pill Row -->
<div class="flex items-center justify-between">
<div class="flex items-center gap-2">
<span class="flex items-center gap-1 font-body-sm text-body-sm text-primary font-semibold">
<span class="material-symbols-outlined text-sm">timer</span>
<span class="">4.2s</span>
</span>
<span class="text-on-surface-variant/40">•</span>
<span class="flex items-center gap-1 font-body-sm text-body-sm text-on-surface font-medium">
<span class="material-symbols-outlined text-sm text-primary">verified</span>
<span class="">100% Precision</span>
</span>
</div>
<!-- Tactical Chip Badges -->
<div class="flex items-center gap-1">
<span class="font-label-tag text-label-tag px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">FORK</span>
<span class="font-label-tag text-label-tag px-2 py-0.5 rounded bg-surface-container text-primary font-bold">M1</span>
</div>
</div>
</div>
</div>
</div>
<!-- Player Spotlight Banner / Coach Quote -->
<div class="px-margin mt-space-sm z-20">
<div class="flex items-center gap-3 bg-surface-container-low p-2.5 rounded-xl">
<div class="relative flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-surface-container-high">
<img class="w-full h-full object-cover" data-alt="Close up dynamic portrait of a confident grandmaster chess instructor wearing dark headphones under ambient green studio lights looking intently ahead." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAvFfs5AExT-48nUwd8ZEwv6yfxe-fzEf-nGFdxR7Ts7RivrBQXIxdBA8gB9DEHGmj7bMomqfsnWgaGaFqhUq6GCuerIKTpaZ2zvURCc-Nbdik6S1ROP6kxo851jxivS3oG11NWJoQYjoEVVa48wGfYMJLdQzf4u0_JWrbp8s1aucPTJqN8Nq1ZhoCnYOmz3i-Jo5FgSKOUS4TKcwDSncoCmafDlaVuGW3Fn4krXXk">
</div>
<div class="flex flex-col min-w-0 flex-1">
<div class="flex items-center justify-between">
<span class="font-label-tag text-label-tag text-primary uppercase font-bold">Stockfish 16 Engine</span>
<span class="font-body-sm text-body-sm text-primary font-bold">Mate in 1 (+#1)</span>
</div>
<p class="font-body-sm text-body-sm text-on-surface truncate">
          Ne5+ forks both royal pieces and seals escape on g8!
        </p>
</div>
</div>
</div>
<!-- Bottom Interactive CTA Panel -->
<div class="flex flex-col gap-2.5 px-margin mt-space-sm z-20">
<!-- Primary Next Puzzle Button (Emerald Energy Pulse) -->
<button class="relative group w-full h-12 rounded-xl bg-primary-container text-on-primary-container font-headline-md text-headline-md font-bold flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(16,185,129,0.4)] active:scale-[0.98] transition-all overflow-hidden" type="button">
<!-- Shimmer Highlight Layer -->
<div class="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
<span class="">Next Puzzle</span>
<span class="material-symbols-outlined text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
</button>
<!-- Secondary Review Analysis Button -->
<button class="w-full h-11 rounded-xl bg-surface-elevated text-on-surface font-body-lg text-body-lg font-semibold flex items-center justify-center gap-2 active:bg-surface-container-highest transition-colors" type="button">
<span class="material-symbols-outlined text-lg text-on-surface-variant">analytics</span>
<span class="">Review Analysis &amp; Lines</span>
</button>
</div>
<!-- Pulsing Reel Gesture Prompt -->
<div class="flex flex-col items-center justify-center mt-space-sm z-20 text-on-surface-variant/70 animate-pulse">
<div class="flex items-center gap-1 font-label-tag text-label-tag uppercase font-bold tracking-wider">
<span class="">Swipe Up for Next Reel</span>
<span class="material-symbols-outlined text-base">expand_less</span>
</div>
</div>
</div>
<script>
  (function initCelebrationSparks() {
    const canvas = document.getElementById('sparks-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    });

    const particles = [];
    const colors = ['#4edea3', '#10b981', '#6ffbbe', '#ffffff', '#ffddb8'];

    // Spawn 35 festive sparks
    for (let i = 0; i < 38; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: height * 0.38 + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 7,
        vy: (Math.random() - 0.7) * 8,
        size: Math.random() * 3 + 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: Math.random() * 0.015 + 0.008
      });
    }

    function render() {
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gentle gravity
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      if (particles.some(p => p.alpha > 0)) {
        requestAnimationFrame(render);
      }
    }

    render();
  })();
</script></main><nav class="fixed bottom-0 inset-x-0 z-50 pb-safe pointer-events-none" data-active-classes="text-primary bg-surface-bright/40"><div class="mx-auto max-w-sm px-margin pb-space-sm"><div class="pointer-events-auto h-16 rounded-full bg-glass-panel backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] flex items-center justify-around px-space-xs"><a aria-current="page" class="flex flex-col items-center justify-center w-14 h-12 rounded-full transition-colors text-primary bg-surface-bright/40" data-path="feed-reels" href="#"><span class="material-symbols-outlined text-2xl">play_circle</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Reels</span></a><a class="flex flex-col items-center justify-center w-14 h-12 rounded-full text-on-surface-variant hover:text-on-surface transition-colors" data-path="leaderboard" href="#"><span class="material-symbols-outlined text-2xl">leaderboard</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Rank</span></a><a class="flex flex-col items-center justify-center w-14 h-12 rounded-full text-on-surface-variant hover:text-on-surface transition-colors" data-path="profile" href="#"><span class="material-symbols-outlined text-2xl">person</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Profile</span></a></div></div></nav>

</body></html>

<!-- Chess Reel - Swipe Transition & Loading State -->
<!DOCTYPE html><html class="dark" lang="en"><head><meta charset="utf-8"><meta content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" name="viewport"><meta content="mobile_tab" name="shell-type"><link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"><link href="https://fonts.googleapis.com" rel="preconnect"><link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&amp;display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet"><style>@layer base{html,body{width:100vw;margin:0;padding:0;background-color:#0A0A0A;}body{overscroll-behavior-y:none;}.pb-safe{padding-bottom:env(safe-area-inset-bottom,0px);}.pt-safe{padding-top:env(safe-area-inset-top,0px);}main>:first-child{margin-top:0!important;}main>:last-child{margin-bottom:0!important;}}::-webkit-scrollbar{display:none;}</style><script src="https://cdn.tailwindcss.com"></script><script id="tailwind-config">tailwind.config = { darkMode: "class", theme: { extend: { colors: { "on-secondary-fixed": "#001f26", "primary-container": "#10b981", "surface-dim": "#131315", "surface-charcoal": "#121214", "obsidian-base": "#0A0A0A", "surface-elevated": "#18181B", "board-light": "#3D3B38", "on-surface": "#e5e1e4", "surface-tint": "#4edea3", "on-secondary-container": "#00424e", "tertiary-container": "#e29100", "on-error-container": "#ffdad6", "on-primary-fixed-variant": "#005236", "error-container": "#93000a", "on-primary-fixed": "#002113", "on-secondary": "#003640", "primary": "#4edea3", "on-secondary-fixed-variant": "#004e5c", "on-surface-variant": "#bbcabf", "glass-panel": "rgba(39, 39, 42, 0.65)", "inverse-primary": "006c49", "background": "#131315", "on-error": "#690005", "surface-container": "#201f21", "on-tertiary-fixed": "#2a1700", "secondary-fixed": "#acedff", "surface-variant": "#353437", "surface": "#131315", "on-background": "#e5e1e4", "glass-border": "rgba(63, 63, 70, 0.35)", "on-tertiary-fixed-variant": "#653e00", "tertiary": "#ffb95f", "feedback-rose": "#EF4444", "secondary-container": "#03b5d3", "inverse-on-surface": "#303032", "inverse-surface": "#e5e1e4", "surface-container-highest": "#353437", "on-tertiary-container": "#523200", "on-tertiary": "#472a00", "board-dark": "#262421", "primary-fixed": "#6ffbbe", "on-primary": "#003824", "outline-variant": "#3c4a42", "surface-container-low": "#1b1b1d", "surface-container-high": "#2a2a2c", "on-primary-container": "#00422b", "surface-container-lowest": "#0e0e10", "error": "#ffb4ab", "tertiary-fixed": "#ffddb8", "surface-bright": "#39393b", "tertiary-fixed-dim": "#ffb95f", "outline": "#86948a", "primary-fixed-dim": "#4edea3", "secondary": "#4cd7f6", "secondary-fixed-dim": "#4cd7f6" }, borderRadius: { "DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px" }, spacing: { "space-sm": "0.5rem", "space-xs": "0.25rem", "space-xl": "2rem", "space-lg": "1.5rem", "margin": "1rem", "gutter-sm": "0.75rem", "space-md": "1rem", "margin-mobile": "0.75rem", "gutter": "1rem" }, fontFamily: { "label-tag": ["Inter"], "headline-xl-mobile": ["Inter"], "body-lg": ["Inter"], "headline-xl": ["Inter"], "label-numeric-md": ["Inter"], "headline-lg": ["Inter"], "headline-lg-mobile": ["Inter"], "body-md": ["Inter"], "body-sm": ["Inter"], "label-numeric-lg": ["Inter"], "headline-md": ["Inter"] }, fontSize: { "label-tag": ["11px", { "lineHeight": "14px", "letterSpacing": "0.06em", "fontWeight": "700" }], "headline-xl-mobile": ["32px", { "lineHeight": "38px", "letterSpacing": "-0.025em", "fontWeight": "800" }], "body-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "-0.01em", "fontWeight": "400" }], "headline-xl": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.03em", "fontWeight": "800" }], "label-numeric-md": ["16px", { "lineHeight": "20px", "letterSpacing": "-0.01em", "fontWeight": "700" }], "headline-lg": ["28px", { "lineHeight": "34px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "headline-lg-mobile": ["24px", { "lineHeight": "30px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "body-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0em", "fontWeight": "400" }], "body-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.01em", "fontWeight": "400" }], "label-numeric-lg": ["22px", { "lineHeight": "26px", "letterSpacing": "-0.02em", "fontWeight": "700" }], "headline-md": ["20px", { "lineHeight": "26px", "letterSpacing": "-0.015em", "fontWeight": "600" }] } } } };</script></head><body class="bg-obsidian-base font-body-md text-on-surface flex flex-col min-h-screen selection:bg-primary-container selection:text-on-primary-fixed"><header class="fixed top-0 inset-x-0 z-50 bg-obsidian-base/80 backdrop-blur-xl pt-safe"><div class="h-16 px-margin flex items-center justify-between gap-gutter-sm"><div class="flex items-center gap-space-xs"><img alt="Chess Reel Logo" class="h-8 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/AEtjO1WBXCPhr93D-ICiOrD7i3yu7g2tkxW1T9d1cbL9n_ghi1Mvk6UJ9rhCNPR6xWRswF6J8g0o4_WHs0_yYCbRREA91S672SJYYTW0hYFRQ2y2gKKHeWC1AmIocGF3XVtX3N8eDd7QwdLvB4i_jcSDQMnL6OpJBzL6W19mVGTwVt6gqBQPTwvsA5vYN3O4NOhlUBOaAlcv3RpWC2MtqZaccfq3VasDqF0XpsgKJjC3U7LG"><span class="font-headline-md text-headline-md tracking-tight text-on-surface hidden sm:inline">Chess Reel</span><span class="font-label-tag text-label-tag uppercase text-on-surface-variant font-bold px-1.5 py-0.5 rounded bg-surface-container-high hidden xs:inline">Feed Reels</span></div><div class="flex items-center gap-space-xs"><div class="flex items-center gap-1 bg-surface-elevated/90 px-2.5 py-1 rounded-full shadow-[0_1px_8px_rgba(0,0,0,0.4)]"><span class="material-symbols-outlined text-primary text-base leading-none">bolt</span><span class="font-label-numeric-md text-label-numeric-md text-primary">1245</span><span class="font-label-tag text-label-tag uppercase text-on-surface-variant">Elo</span></div><div class="flex items-center gap-1 bg-surface-elevated/90 px-2 py-1 rounded-full"><span class="material-symbols-outlined text-tertiary text-base leading-none">local_fire_department</span><span class="font-label-numeric-md text-label-numeric-md text-tertiary">5</span></div><div class="w-2.5 h-2.5 rounded-full bg-primary/20 flex items-center justify-center"><div class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div></div><a class="relative flex items-center justify-center rounded-full p-0.5 min-w-[32px] min-h-[32px]" data-path="profile" href="#"><img alt="Profile" class="w-8 h-8 rounded-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhwSfWRMEZLburV6h2jEmdFREU9wn4O7igLSICjZtjG8FyrmqA2SRMoB1AVPJOVUgXQW0dCete_jys_B6e6vVgIEpRCRkSD8t9dtVZU4vPNZkSiC-KxMHRA7EBMEKgzG0hgbDqSKtdUUtOfuZfxqavsrkj26eS-2TVDK_AD2p_7rnjnhq7OAf0hwy2pU1tNYajw0BsZDY6F14r1wgLh1Y6yIovm2qumLbqksrYhgc"></a></div></div></header><main class="flex flex-col relative w-full pt-16 pb-24 bg-obsidian-base min-h-screen"><div class="flex flex-col w-full relative select-none overflow-hidden pb-12">
<div class="relative w-full max-w-md mx-auto h-[680px] perspective-[1200px] overflow-hidden rounded-xl bg-obsidian-base shadow-2xl">
<!-- PREVIOUS SOLVED PUZZLE CARD (Sliding up and out: translateY -52%, scaled back, opacity drop) -->
<div class="absolute inset-x-0 top-0 h-[640px] px-margin-mobile flex flex-col justify-between -translate-y-[52%] scale-[0.93] opacity-40 blur-[1px] transition-transform pointer-events-none z-10">
<!-- Outgoing Card Top Stats -->
<div class="flex items-center justify-between bg-surface-charcoal/90 backdrop-blur-md px-space-md py-space-sm rounded-xl shadow-md">
<div class="flex items-center gap-space-xs">
<span class="bg-primary/20 text-primary font-label-tag text-label-tag px-2 py-0.5 rounded-full font-bold uppercase">Solved</span>
<span class="text-on-surface-variant font-body-sm text-body-sm">Puzzle #8,421</span>
</div>
<div class="flex items-center gap-1 text-primary font-label-numeric-md text-label-numeric-md">
<span class="">+14</span>
<span class="material-symbols-outlined text-base">trending_up</span>
</div>
</div>
<!-- Outgoing Mini Mock Board -->
<div class="w-full aspect-square max-w-[340px] mx-auto bg-surface-charcoal p-2 rounded-xl shadow-lg relative opacity-70">
<div class="w-full h-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden bg-board-dark">
<div class="col-start-3 row-start-2 bg-primary/30 flex items-center justify-center">
<span class="material-symbols-outlined text-primary text-xl">star</span>
</div>
<div class="col-start-6 row-start-5 bg-primary/20 flex items-center justify-center">
<span class="material-symbols-outlined text-on-surface text-xl">sports_esports</span>
</div>
</div>
<div class="absolute inset-0 bg-gradient-to-t from-obsidian-base via-transparent to-transparent rounded-xl"></div>
</div>
<!-- Outgoing Evaluation Bar -->
<div class="bg-surface-charcoal/80 p-space-sm rounded-xl flex items-center justify-between">
<span class="font-body-sm text-body-sm text-on-surface-variant">Mate in 2 executed</span>
<span class="font-label-tag text-label-tag text-primary uppercase font-bold">100% Accuracy</span>
</div>
</div>
<!-- INCOMING REEL CARD (Sliding Up from bottom, 3D perspective pitch tilt) -->
<div class="absolute inset-x-0 bottom-0 top-[14%] px-margin-mobile flex flex-col justify-between transform translate-y-0 rotate-x-[4deg] transition-all duration-500 z-20">
<!-- Top Puzzle Header: Skeleton State -->
<div class="bg-surface-charcoal/90 backdrop-blur-xl p-space-md rounded-xl shadow-xl flex items-center justify-between">
<div class="flex items-center gap-space-sm">
<!-- Animated Tag Pill Skeleton -->
<div class="h-6 w-20 rounded-full bg-surface-container-highest animate-pulse flex items-center px-2">
<div class="h-2 w-12 rounded bg-surface-variant"></div>
</div>
<!-- Puzzle ID Skeleton -->
<div class="h-4 w-16 rounded bg-surface-container-high animate-pulse"></div>
</div>
<!-- Target Elo Pill Skeleton -->
<div class="flex items-center gap-1.5 bg-surface-container-low px-3 py-1 rounded-full">
<div class="w-2.5 h-2.5 rounded-full bg-primary/40 animate-ping"></div>
<div class="h-3 w-14 rounded bg-surface-container-highest animate-pulse"></div>
</div>
</div>
<!-- Center Dynamic Skeleton Chessboard Container -->
<div class="relative w-full aspect-square max-w-[360px] mx-auto bg-surface-charcoal p-2 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] flex items-center justify-center overflow-hidden">
<!-- Subtle Ambient Shimmer Wave Layer -->
<div class="absolute -inset-full bg-gradient-to-tr from-transparent via-primary/5 to-transparent -rotate-45 animate-[spin_8s_linear_infinite] pointer-events-none"></div>
<!-- 8x8 Chessboard Shimmer Grid -->
<div class="w-full h-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden bg-board-dark shadow-inner relative">
<!-- Alternating Dark & Light Tiles with Wave Opacity -->
<!-- Row 1 -->
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<!-- Row 2 -->
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<!-- Row 3 -->
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<!-- Row 4 -->
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<!-- Row 5 -->
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<!-- Row 6 -->
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<!-- Row 7 -->
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<div class="bg-board-light/40"></div><div class="bg-board-dark/90"></div>
<!-- Row 8 -->
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
<div class="bg-board-dark/90"></div><div class="bg-board-light/40"></div>
</div>
<!-- Pulse Highlight on King square to simulate incoming arrangement -->
<div class="absolute inset-0 grid grid-cols-8 grid-rows-8 pointer-events-none p-2">
<div class="col-start-5 row-start-8 m-1 rounded bg-primary/20 animate-pulse"></div>
<div class="col-start-4 row-start-4 m-1 rounded bg-tertiary/20 animate-pulse"></div>
</div>
<!-- Central Elo-Matched Loading Emblem Badge -->
<div class="absolute z-30 flex flex-col items-center justify-center p-space-md rounded-xl bg-surface-charcoal/95 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] max-w-[240px] text-center">
<div class="relative w-12 h-12 mb-space-xs flex items-center justify-center">
<!-- Pulsing outer orbit ring -->
<div class="absolute inset-0 rounded-full bg-primary/10 animate-ping"></div>
<!-- Spinning knight icon container -->
<div class="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shadow-md">
<span class="material-symbols-outlined text-primary text-2xl animate-[spin_3s_linear_infinite]" style="font-variation-settings: 'FILL' 1;">
                chess_knight
              </span>
</div>
</div>
<span class="font-headline-md text-[13px] leading-tight text-on-surface font-semibold tracking-tight">
            Matching Elo Line
          </span>
<span class="font-body-sm text-[11px] text-on-surface-variant mt-0.5">
            Generating 1250-rated puzzle...
          </span>
<!-- Micro Progress Ticker Bar -->
<div class="w-24 h-1 bg-surface-container rounded-full overflow-hidden mt-space-xs">
<div class="h-full bg-primary rounded-full transition-all duration-300 w-2/3 animate-pulse" id="loading-bar"></div>
</div>
</div>
<!-- Coordinate Overlays Skeletal Indicators -->
<div class="absolute bottom-3 left-3 text-[9px] font-bold text-on-surface-variant/40">a1</div>
<div class="absolute top-3 right-3 text-[9px] font-bold text-on-surface-variant/40">h8</div>
</div>
<!-- Right Reel Action Stack: Skeleton Floating Dock (TikTok Paradigm) -->
<div class="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-space-md z-30">
<!-- Hint Button Skeleton -->
<div class="flex flex-col items-center gap-1">
<div class="w-10 h-10 rounded-full bg-surface-charcoal/90 backdrop-blur-md flex items-center justify-center shadow-lg">
<div class="w-4 h-4 rounded-full bg-surface-container-highest animate-pulse"></div>
</div>
<div class="w-6 h-2 rounded bg-surface-container-high animate-pulse"></div>
</div>
<!-- Pass / Skip Button Skeleton -->
<div class="flex flex-col items-center gap-1">
<div class="w-10 h-10 rounded-full bg-surface-charcoal/90 backdrop-blur-md flex items-center justify-center shadow-lg">
<div class="w-4 h-4 rounded-full bg-surface-container-highest animate-pulse"></div>
</div>
<div class="w-6 h-2 rounded bg-surface-container-high animate-pulse"></div>
</div>
<!-- Bookmark / Like Skeleton -->
<div class="flex flex-col items-center gap-1">
<div class="w-10 h-10 rounded-full bg-surface-charcoal/90 backdrop-blur-md flex items-center justify-center shadow-lg">
<div class="w-4 h-4 rounded-full bg-surface-container-highest animate-pulse"></div>
</div>
<div class="w-6 h-2 rounded bg-surface-container-high animate-pulse"></div>
</div>
</div>
<!-- Bottom Card Metadata & CTA Skeleton -->
<div class="bg-surface-charcoal/90 backdrop-blur-xl p-space-md rounded-xl shadow-lg flex flex-col gap-space-xs mt-space-xs">
<div class="flex items-center justify-between">
<div class="flex items-center gap-space-xs">
<div class="w-3 h-3 rounded-full bg-surface-container-highest animate-pulse"></div>
<div class="h-3.5 w-28 rounded bg-surface-container-highest animate-pulse"></div>
</div>
<div class="h-3 w-12 rounded bg-surface-container-high animate-pulse"></div>
</div>
<div class="h-2.5 w-3/4 rounded bg-surface-container animate-pulse"></div>
</div>
</div>
<!-- FLOATING GESTURE CUE: Swipe-Up Velocity Curve Indicator -->
<div class="absolute bottom-6 inset-x-0 flex flex-col items-center pointer-events-none z-40">
<!-- Curved Gesture Trail SVG -->
<div class="relative w-12 h-16 flex items-center justify-center">
<svg class="w-full h-full text-primary" fill="none" viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg">
<!-- Flowing arrow track -->
<path class="opacity-40" d="M24 54C24 40 24 24 24 16" stroke="currentColor" stroke-dasharray="4 4" stroke-linecap="round" stroke-width="2.5"></path>
<path class="animate-bounce" d="M16 22L24 14L32 22" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"></path>
</svg>
</div>
<div class="bg-surface-charcoal/80 backdrop-blur-md px-3 py-1 rounded-full shadow-lg -mt-1 flex items-center gap-1.5">
<span class="material-symbols-outlined text-primary text-xs">swipe_up</span>
<span class="font-label-tag text-[10px] tracking-wider uppercase text-on-surface-variant font-bold">Swipe next reel</span>
</div>
</div>
</div>
<!-- Interactive Demo Controls & Feedback Micro-Panel -->
<div class="w-full max-w-md mx-auto px-margin-mobile mt-space-md flex items-center justify-between">
<div class="flex items-center gap-2">
<span class="w-2 h-2 rounded-full bg-primary animate-ping"></span>
<span class="font-body-sm text-body-sm text-on-surface-variant">Real-time Stream Engine</span>
</div>
<button class="bg-surface-container-high hover:bg-surface-bright text-on-surface text-label-tag font-label-tag px-3 py-1.5 rounded-lg transition-transform active:scale-95 flex items-center gap-1" id="toggle-trigger" type="button">
<span class="material-symbols-outlined text-sm text-primary">autorenew</span>
      Simulate Finish
    </button>
</div>
</div>
<script>
  // Simple micro-interaction for demo preview toggle
  const triggerBtn = document.getElementById('toggle-trigger');
  const loadingBar = document.getElementById('loading-bar');
  let loaded = false;

  triggerBtn?.addEventListener('click', () => {
    loaded = !loaded;
    if (loaded) {
      loadingBar.style.width = '100%';
      triggerBtn.innerHTML = '<span class="material-symbols-outlined text-sm text-feedback-rose">replay</span> Reset State';
    } else {
      loadingBar.style.width = '66%';
      triggerBtn.innerHTML = '<span class="material-symbols-outlined text-sm text-primary">autorenew</span> Simulate Finish';
    }
  });
</script></main><nav class="fixed bottom-0 inset-x-0 z-50 pb-safe pointer-events-none" data-active-classes="text-primary bg-surface-bright/40"><div class="mx-auto max-w-sm px-margin pb-space-sm"><div class="pointer-events-auto h-16 rounded-full bg-glass-panel backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.6)] flex items-center justify-around px-space-xs"><a aria-current="page" class="flex flex-col items-center justify-center w-14 h-12 rounded-full transition-colors text-primary bg-surface-bright/40" data-path="feed-reels" href="#"><span class="material-symbols-outlined text-2xl">play_circle</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Reels</span></a><a class="flex flex-col items-center justify-center w-14 h-12 rounded-full text-on-surface-variant hover:text-on-surface transition-colors" data-path="leaderboard" href="#"><span class="material-symbols-outlined text-2xl">leaderboard</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Rank</span></a><a class="flex flex-col items-center justify-center w-14 h-12 rounded-full text-on-surface-variant hover:text-on-surface transition-colors" data-path="profile" href="#"><span class="material-symbols-outlined text-2xl">person</span><span class="font-label-tag text-[10px] tracking-tight uppercase">Profile</span></a></div></div></nav>

</body></html>