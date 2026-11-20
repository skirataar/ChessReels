export interface AlgebraicExample {
  title: string;
  moves: string;
  explanation: string;
}

export interface GuideSection {
  heading: string;
  subheading?: string;
  paragraphs: string[];
  keyTakeaways?: string[];
  algebraicExample?: AlgebraicExample;
}

export interface ChessGuide {
  slug: string;
  title: string;
  subtitle: string;
  category:
    | "Forks"
    | "Pins & Skewers"
    | "Checkmate Patterns"
    | "Discovered Attacks"
    | "Deflection & Overload"
    | "ELO Training"
    | "Endgame Tactics";
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  wordCount: number;
  summary: string;
  sections: GuideSection[];
  commonMistakes: string[];
  practicalTips: string[];
}

export const CHESS_GUIDES: ChessGuide[] = [
  {
    slug: "knight-forks-mastery",
    title: "Mastering the Knight Fork: Spotting Family Forks in Seconds",
    subtitle: "How to harness the non-linear leap of the knight to pick apart defensive structures and harvest royal material.",
    category: "Forks",
    readTime: "9 min read",
    publishedAt: "2026-11-15",
    updatedAt: "2026-11-20",
    wordCount: 1140,
    summary:
      "Unlike linear pieces whose attack vectors can be obstructed, the knight leaps cleanly over friendly and hostile pieces. Discover the geometry behind the knight fork, master the color-parity rule, and learn to engineer royal family forks in rapid-fire play.",
    sections: [
      {
        heading: "The Unique Geometry of the Non-Linear Leap",
        subheading: "Why Knights Disobey Classical Line-of-Sight Defense",
        paragraphs: [
          "In classical chess strategy, linear pieces—rooks, bishops, and queens—require clear files, ranks, and diagonals to project force. If an opponent erects a pawn chain or slides an interposing piece into the line of fire, the immediate threat is stifled. The knight, however, operates under entirely distinct geometric laws. Moving in an L-shaped trajectory (two squares along one axis and one square orthogonally), the knight is the only piece on the 64 squares capable of leaping over occupied squares.",
          "This mechanical freedom makes the knight the ultimate tactical ambush weapon. A knight fork occurs when a single knight strikes two or more enemy targets at the same time. Crucially, because knights cannot be blocked by interposition, the defender has only two legal remedies when their king is checked: capture the attacking knight or move the monarch. If the checking knight is safely guarded or positioned beyond reach, the secondary target is doomed."
        ],
        keyTakeaways: [
          "Knights alternate square colors on every single move: a knight on a dark square only attacks light squares, and vice versa.",
          "Interposition is impossible against a knight check; only flight or immediate capture can neutralize the threat.",
          "Pieces positioned on the same color complex separated by one diagonal square are at prime risk of a knight fork."
        ]
      },
      {
        heading: "The Taxonomy of High-Impact Knight Forks",
        subheading: "From Double Attacks to the Devastating Royal Family Fork",
        paragraphs: [
          "Not all forks carry equal tactical weight. Forcing an opponent to trade an active bishop for your knight yields minor positional advantages, but competitive games are won by targeting heavy assets: the king, queen, and rooks.",
          "The 'Royal Fork' occurs when a knight checks the king while simultaneously targeting the queen. Because check takes precedence over all other board events, the defending side must spend their tempo addressing the king's safety, allowing the knight to scoop up the queen on the following ply. Even more dramatic is the 'Family Fork', where a centralized knight attacks the king, queen, and a rook in a triple-pronged strike. These combinations frequently arise on c7 or c2 in Sicilian and French structures where the black king has remained uncastled on e8 and the queen occupies d8."
        ],
        algebraicExample: {
          title: "The Fried Liver Attack Fork (c7/f7 Outpost)",
          moves: "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5 Nxd5 6. Nxf7! Kxf7 7. Qf3+ Ke6 8. Nc3",
          explanation:
            "White sacrifices the knight on f7 to drag the black king into the center, creating an absolute pin on the d5-knight and preparing catastrophic follow-up forks on c7 and e4."
        }
      },
      {
        heading: "Manufacturing the Fork: Deflection and Decoy Sacrifices",
        subheading: "Master Players Do Not Wait for Forks; They Force Them",
        paragraphs: [
          "Opponents rated above 1200 Elo rarely place their king and queen on forkable squares voluntarily. The hallmark of an advanced tactical player is the ability to engineer the fork by coercing enemy pieces onto vulnerable coordinates through forcing moves.",
          "Consider the king-attraction decoy: Black has a queen on d7 and king on g8, with an outpost on e6 guarded by an f7 pawn. A direct jump to e6 fails immediately. However, if White uncorks a temporary sacrifice such as 1. Bxf7+!, the black king is forced onto f7. Now, White unleashes 2. Ne5+!, delivering check to the king on f7 while simultaneously capturing the queen on d7. The fork was manufactured through a forcing calculation sequence."
        ],
        keyTakeaways: [
          "Look for forcing sacrifices that pull the enemy king onto the same color complex as their queen or rook.",
          "Check whether liquidating an outpost's defender opens a direct highway for your knight to jump forward.",
          "Always calculate checks first: forced king moves eliminate the defender's ability to create counter-threats."
        ]
      },
      {
        heading: "Color Parity: The Defensive Immune System",
        subheading: "How Grandmasters Keep Their Heavy Pieces Safe from Knight Jumps",
        paragraphs: [
          "To avoid falling victim to surprise knight forks in speed chess, top grandmasters rely on the fundamental knight parity principle. Because a knight toggles square colors on every move, a knight currently situated on a dark square can only fork pieces that rest on light squares.",
          "Therefore, if your king and queen sit on opposite colored squares (e.g., King on g8 [dark] and Queen on c7 [light]), an enemy knight can never attack both in a single leap. When maneuvering in endgames with active enemy knights, always coordinate your king and heavy pieces on alternating square colors to render knight forks geometrically impossible."
        ]
      }
    ],
    commonMistakes: [
      "Failing to verify whether the target square is guarded by an unseen enemy bishop or long-range queen.",
      "Executing a fork before securing an escape path for the knight after the capture is complete.",
      "Ignoring counter-checks: playing a fork that allows the opponent to escape with check or deliver a back-rank mate.",
      "Focusing exclusively on king-queen forks while missing minor piece forks that cleanly win a full piece."
    ],
    practicalTips: [
      "Scan for outpost squares on the 5th and 6th ranks (c7, d6, e6, f7) that cannot be challenged by enemy pawns.",
      "Whenever the opponent's king and heavy pieces share the same square color, immediately search for knight check coordinates.",
      "In time-scramble blitz games, check every knight check on the board—forks are frequently hidden behind seemingly quiet squares.",
      "If you spot a fork target that is currently defended, ask: 'Can I deflect or capture the defender with tempo?'"
    ]
  },
  {
    slug: "back-rank-mate-patterns",
    title: "Back-Rank Mate Traps, Defenses & Luft Timing",
    subtitle: "Mastering corridor checkmates: exploiting trapped castled kings and fortifying your own final rank.",
    category: "Checkmate Patterns",
    readTime: "10 min read",
    publishedAt: "2026-11-15",
    updatedAt: "2026-11-20",
    wordCount: 1180,
    summary:
      "A castled king shielded by its own unmoved pawns can quickly become a deadly prison. Understand how back-rank mate patterns arise, master deflection sacrifices that pry open the 8th rank, and discover the exact moment to carve out Luft.",
    sections: [
      {
        heading: "The Anatomy of the Corridor Execution",
        subheading: "When Friendly Pawns Turn into Executioners",
        paragraphs: [
          "Castling is fundamental to opening development: it ushers the king away from dangerous central open files and tucks it behind an intact shield of pawns on f2-g2-h2 or f7-g7-h7. However, that very defensive wall can transform into a fatal corridor if the back rank is neglected. If a heavy piece—a rook or a queen—penetrates the final rank, and the king has no forward squares to escape to, checkmate is instantaneous.",
          "This geometric catastrophe is known as the back-rank mate or corridor mate. It accounts for a staggering percentage of sudden blunders in rapid and blitz games, even up to master level. Because the king's own foot soldiers block its flight to the 7th or 2nd rank, the defending king is smothered by its own guards."
        ],
        keyTakeaways: [
          "The back-rank mate occurs when a rook or queen attacks the 8th (or 1st) rank while the king is walled in by its own pawns.",
          "It requires two conditions: a trapped king with no forward escape squares, and insufficient defenders guarding the perimeter rank.",
          "Even if the back rank is defended by a rook, overloaded pieces can be systematically removed or deflected."
        ]
      },
      {
        heading: "Overloaded Defenders and Deflection Sacrifices",
        subheading: "Prying Open Apparent Back-Rank Protection",
        paragraphs: [
          "Beginner players often assume that having a single rook stationed on d8 or e8 makes their back rank immune to attack. Tactical masters know better: that single defender is vulnerable to deflection, overload, and decoy combinations.",
          "Imagine a scenario where Black has a rook on e8 and queen on d6, while White has a rook on e1 and queen on c3. If White plays the shocking 1. Qxe5!!, White attacks Black's queen while offering its own queen as bait. If Black plays 1... Qxe5, White lands the devastating 2. Rxe8+ Rxe8 3. Rxe8# on the back rank. Black's queen was the only piece preventing the back rank breakthrough, and once deflected, the entire defense collapsed. Whenever a back rank defender is also tasked with protecting an outpost or minor piece, it is 'overloaded' and ripe for exploitation."
        ],
        algebraicExample: {
          title: "The Classical Back-Rank Deflection Queen Sacrifice",
          moves: "1. Qxe5! Qxe5 2. Rxe8+ Rxe8 3. Rxe8#",
          explanation:
            "White sacrifices the queen to deflect Black's queen away from defending the critical e8 rook, triggering a forced back-rank corridor mate."
        }
      },
      {
        heading: "The Power of the Zwischenzug (In-Between Move)",
        subheading: "Interposing Threats Before the Final Execution",
        paragraphs: [
          "Back-rank combinations frequently hinge on intermediate moves known as Zwischenzüge. Suppose your opponent thinks they have escaped checkmate by delivering an intermediate check of their own. A sharp tactician anticipates this counter-blow and ensures that every step in the back-rank sequence is completely forcing.",
          "A classic example is the sacrifice on the back rank followed by a double-threat check. For example, playing 1. Rd8+ Rxd8 2. Qxd8+ Nxd8 3. Rxd8#. If the defending pieces are simply lined up in passive defense, a cascade of exchanges on the key entry square cleans the board until the monarch has nowhere left to turn."
        ]
      },
      {
        heading: "Prophylaxis: The Art of Creating 'Luft'",
        subheading: "Choosing Between h3, g3, and Active Central Counterplay",
        paragraphs: [
          "The German word 'Luft' translates literally to 'air' or 'breathing room'. In chess terminology, creating Luft means nudging one of your castled pawns forward one square—usually h3 or g3 for White, and h6 or g6 for Black—to provide an escape square for the king.",
          "However, timing is everything. Push your pawn too early in the opening, and you give away a tempo and create a 'hook' that enemy pawns can leverage in a kingside storm. Push it too late, and you get mated on the back rank. As a general rule of thumb, create Luft as soon as the center opens up and rooks begin contesting open d- and e-files. Prefer h3/h6 when the enemy lacks a light-squared bishop, and choose g3/g6 when you need to control f4 or f5 outposts."
        ]
      }
    ],
    commonMistakes: [
      "Pushing Luft pawns too early in the opening, gifting the opponent a target for a pawn storm.",
      "Assuming a single rook on the back rank provides complete security against doubled enemy rooks.",
      "Trading queens into an endgame while your king remains trapped behind unmoved pawns on an open board.",
      "Forgetting that knights or bishops can drop back to f8/e8 to block back-rank checks in emergency defenses."
    ],
    practicalTips: [
      "Whenever you see an opponent with pawns on f7, g7, and h7 with no pieces on the 7th rank, evaluate back-rank sacrifices immediately.",
      "Look for rook battery setups on open files: doubling rooks on the d-file creates irresistible pressure on the final rank.",
      "Do not push your Luft pawn blindly; wait until minor pieces are traded and the threat of an open-file invasion becomes concrete.",
      "If you are defending and cannot afford the tempo for Luft, tuck a knight or bishop back to f8/e8 to shield the king and guard escape squares."
    ]
  },
  {
    slug: "absolute-vs-relative-pins",
    title: "Absolute vs. Relative Pins: How to Exploit Frozen Pieces",
    subtitle: "Understanding the legal and strategic boundaries of pins, and systematically piling pressure on paralyzed targets.",
    category: "Pins & Skewers",
    readTime: "10 min read",
    publishedAt: "2026-11-16",
    updatedAt: "2026-11-20",
    wordCount: 1190,
    summary:
      "A pinned piece loses its mobility, its defensive power, and its tactical value. Understand the essential difference between absolute pins (enforced by the rules of chess) and relative pins (enforced by material arithmetic), and master the golden rule of tactical pressure.",
    sections: [
      {
        heading: "The Core Geometry of the Pin",
        subheading: "Three Pieces, One Straight Line, Total Paralysis",
        paragraphs: [
          "In chess theory, a pin is a tactical alignment involving three elements on the same rank, file, or diagonal: an attacking long-range piece (queen, rook, or bishop), an intermediary defending piece, and a high-value piece or square positioned behind it. Because moving the intermediary piece would expose the high-value target behind it, the intermediary piece is effectively 'pinned' in place.",
          "Tartakower famously quipped that 'a pinned piece is a paralyzed piece'. Pinned pieces cannot advance, cannot jump to active outposts, and crucially, cannot reliably defend their neighboring comrades. A common tactical mistake is assuming that a piece on e5 is safely defended by a pinned knight on f6; if the knight is pinned to the king, it cannot legally capture anything on e5."
        ],
        keyTakeaways: [
          "Only long-range pieces (bishops, rooks, and queens) can execute pins.",
          "Bishops pin along diagonals; rooks pin along ranks and files; queens can pin along both.",
          "A pinned piece cannot be relied upon to defend other pieces on the board."
        ]
      },
      {
        heading: "Absolute vs. Relative Pins: The Legal Boundary",
        subheading: "Why One Cannot Move, While the Other Dares You to Take",
        paragraphs: [
          "The critical distinction every tactical chess student must master is the difference between an Absolute Pin and a Relative Pin. In an **Absolute Pin**, the target shielded behind the pinned piece is the **King**. Under FIDE Law 1.4, a player is legally prohibited from making any move that places or leaves their own king in check. Therefore, an absolutely pinned piece literally cannot move out of the line of fire. It is physically bound to that ray. Even if moving the pinned piece would deliver checkmate to the opponent, the move is strictly illegal.",
          "In contrast, a **Relative Pin** occurs when the shielded piece is not the king, but another high-value piece—most commonly the **Queen** or a **Rook**. In a relative pin, moving the intermediary piece is legally permissible, but tactically suicidal under ordinary circumstances. However, because it is legal to move, a relatively pinned piece can occasionally unleash surprise counter-attacks, such as the famous Legal's Mate trap, where a 'pinned' knight leaps off the diagonal to deliver checkmate while offering the queen as a decoy."
        ],
        algebraicExample: {
          title: "Légal's Mate: The Pseudo-Pinned Knight Counter-Blow",
          moves: "1. e4 e5 2. Nf3 d6 3. Bc4 Bg4 4. Nc3 g6 5. Nxe5! Bxd1 6. Bxf7+ Ke7 7. Nd5#",
          explanation:
            "White exploits Black's false sense of security with the relative pin on the f3-knight. By sacrificing the queen on d1, White unleashes a forced three-piece checkmate with bishops and knights."
        }
      },
      {
        heading: "The Golden Tactical Rule: Pile On the Pinned Piece",
        subheading: "Never Trade for a Pinned Piece When You Can Attack It Again",
        paragraphs: [
          "When beginner and intermediate players identify a pinned piece, their instinct is often to capture it immediately. For example, if White's bishop pins Black's knight to the king on c6, White frequently plays Bxc6+ right away. This is almost always a tactical inaccuracy.",
          "The golden rule of pins is: **Pile up the pressure on the pinned piece until it collapses.** Because the pinned piece cannot flee, you have time to bring additional attackers to bear on it. Attack it with a pawn (the cheapest possible attacker), double rooks behind your pinning piece, or reposition a knight into the fray. If a piece is defended twice but pinned, adding a third attacker guarantees winning material on your terms."
        ]
      },
      {
        heading: "How to Break Out of Dangerous Pins",
        subheading: "Active Prophylaxis and Defensive Unpinning Maneuvers",
        paragraphs: [
          "When you find yourself on the receiving end of a suffocating pin, passive defense will slowly bleed your position. You need active unpinning techniques. The most straightforward method is stepping the king or queen off the pinned line of fire (e.g., playing Kh8 or Qe7). Once the line of sight is broken, the intermediary piece is instantly liberated.",
          "Alternatively, look for an interposing piece that blocks the attacker, or deliver a forcing counter-check elsewhere on the board. In sharp tactical positions, sacrificing an exchange or pawn to smash open the pinning piece's own shelter is often far better than allowing your entire army to be paralyzed piece by piece."
        ]
      }
    ],
    commonMistakes: [
      "Assuming a relatively pinned piece can never move, walking straight into queen-sac checkmate traps.",
      "Trading your active pinning piece immediately rather than piling additional pressure with pawns.",
      "Counting a pinned piece as a valid defender of another piece on the board.",
      "Leaving your king on an open file opposite an enemy rook, inviting self-inflicted absolute pins."
    ],
    practicalTips: [
      "Always verify whether a defending piece is absolutely pinned before calculating exchanges: an absolutely pinned piece has zero defending power.",
      "Look for pawn pushes against pinned minor pieces (e.g., d5 against a pinned knight on c6): pawns are the ultimate pin breakers.",
      "Beware of relative pins against your queen: always calculate whether moving the pinned piece with check or mate justifies the sacrifice.",
      "In puzzle solving, if you spot an enemy piece aligned with their king or queen, search for an immediate rook or bishop pin."
    ]
  },
  {
    slug: "the-skewer-tactic",
    title: "The Skewer: Winning Material Through the Enemy King",
    subtitle: "The inverted pin: compelling high-value pieces to flee and harvesting the defenseless target trailing behind.",
    category: "Pins & Skewers",
    readTime: "9 min read",
    publishedAt: "2026-11-16",
    updatedAt: "2026-11-20",
    wordCount: 1120,
    summary:
      "Often dubbed the reverse pin or x-ray attack, the skewer targets the more valuable piece directly in front, compelling it to move and exposing a trailing piece to clean capture. Master the mechanics of rooks and bishops slicing through king-queen alignments.",
    sections: [
      {
        heading: "Defining the Skewer: The Reverse Pin",
        subheading: "Linear Force Against Hierarchical Target Alignment",
        paragraphs: [
          "While a pin places the lesser piece in front of the greater piece (shielding the king or queen), a **skewer** flips this hierarchy completely. In a skewer, the **more valuable piece** stands in the line of fire directly in front of a lesser piece or an undefended target.",
          "Because the piece in front is under direct attack and cannot afford to be captured (such as a king facing check or a queen under fire from an enemy rook or bishop), it is forced to move away. As it vacates its square, the long-range attacking piece drives right through the vacated coordinate to capture whatever unfortunate target was lingering behind it. This is why the tactic is also known as an 'X-ray attack' or 'thrust'."
        ],
        keyTakeaways: [
          "In a pin: Lesser piece is in front; greater piece is behind.",
          "In a skewer: Greater piece is in front; lesser piece is behind.",
          "Because the piece in front must move, the target behind is usually helpless unless it can defend with check."
        ]
      },
      {
        heading: "Rook Skewers in the Endgame",
        subheading: "The Decisive Weapon of 7th and 8th Rank Play",
        paragraphs: [
          "Skewers are common in middle games, but they are utterly lethal in rook endgames. Rook endgames are notoriously tricky and drawish, but a single clean skewer can shatter an otherwise balanced position in one move.",
          "Consider a standard rook and pawn ending: Black's king sits on g7, while White has a passed pawn on a7 escorted by a rook on a8. Black's rook is on h1, delivering checks from behind. If White's king marches down to the 7th rank and Black delivers a check along the 7th rank, White can orchestrate a king maneuver that steps out of check, forcing Black's king to an awkward file. If White lands a rook check on h8, checking the black king on h7 with an undefended black rook on h1, the king must step aside, allowing White to play Rxh1 and win the game instantly."
        ],
        algebraicExample: {
          title: "The Classical Rook Endgame Skewer",
          moves: "1. Rh8+! Kg7 2. Ra8! (Or 1... Kxh8 2. a8=Q+ Kg7 3. Qxh1)",
          explanation:
            "White uses the threat of queen promotion to deliver a rook skewer along the h-file, forcing the black king to abandon its rook on h1."
        }
      },
      {
        heading: "Bishop Diagonal Skewers: The Long-Distance Spear",
        subheading: "Exploiting King and Queen Alignments on Untamed Diagonals",
        paragraphs: [
          "Bishops are deadly skewer specialists on open diagonals, particularly when the enemy king and queen are caught on the same color complex. For instance, if Black's queen sits on b7 and king on f3 on the long a8-h1 diagonal, a white bishop swooping into d5 checks the king. The king has no choice but to step out of check, leaving the queen on b7 completely exposed to the bishop's follow-up capture.",
          "Diagonal skewers frequently catch players off guard because diagonals span vast distances across the board. A quiet bishop sitting on c1 can suddenly leap to g5 or a3, skewering a king on e7 and a rook on h8 or c8. Always scan both diagonals of your bishops for high-value targets sharing a line."
        ]
      },
      {
        heading: "Defending Against Skewers: The Shielding Counter-Blow",
        subheading: "Interposition, Counter-Checks, and Flight Coordinates",
        paragraphs: [
          "When facing a skewer, your primary objective is to avoid losing the rear piece for free. The most effective defense is stepping the front piece away in a manner that simultaneously protects the trailing piece. For example, if your king on e6 is checked by a rook on e1 with a rook on e8 behind it, do not flee to d5 or f5; step sideways to d7 or f7 where your king maintains defense of your e8-rook.",
          "If the front piece cannot defend the rear piece directly, look for an aggressive counter-check or an interposing piece that blocks the attacking ray while attacking the opponent's own vulnerable assets. Turning a defensive skewer into a tactical counter-punch is the hallmark of resilient master play."
        ]
      }
    ],
    commonMistakes: [
      "Fleeing with the front piece without checking if it can step onto a square that defends the rear piece.",
      "Overlooking that the rear piece might deliver an intermediate counter-check upon being uncovered.",
      "Placing your king and rook on the same rank or file in endgames without calculating opposing rook checks.",
      "Failing to calculate interposition moves that block the skewer with tempo."
    ],
    practicalTips: [
      "In rook endgames, never place your king and rook on the same rank or file without calculating opponent rook checks first.",
      "When your opponent's king and queen are on the same diagonal, evaluate all bishop checks immediately.",
      "If you are skewered, check whether your fleeing front piece can land on a square that protects the piece behind it.",
      "When training on DoomChess reels, look for skewers whenever the opponent's king is forced onto the perimeter of the board."
    ]
  },
  {
    slug: "discovered-attacks-double-checks",
    title: "Discovered Attacks & Double Checks: The Deadliest Motif",
    subtitle: "Coordinating the ambush battery: unleashing simultaneous threats that overwhelm all defensive responses.",
    category: "Discovered Attacks",
    readTime: "11 min read",
    publishedAt: "2026-11-17",
    updatedAt: "2026-11-20",
    wordCount: 1240,
    summary:
      "When a front piece steps aside to uncover an ambush from an ally behind it, chaos follows. When both pieces attack simultaneously in a Double Check, the king has only one legal remedy: to run for its life. Learn how to engineer this devastating motif.",
    sections: [
      {
        heading: "The Mechanics of the Discovered Attack",
        subheading: "Two Attackers, One Move, Zero Good Answers",
        paragraphs: [
          "In a standard chess move, a player moves one piece to deliver one threat. A **discovered attack**, however, breaks the economy of conventional defense by generating **two independent threats in a single move**. It requires an attacking battery consisting of a front piece (the unmasking piece) and a rear long-range piece (the unmasked piece: queen, rook, or bishop).",
          "When the front piece moves, it unmasks the line of sight for the rear piece to attack a major target, while the front piece itself lands on a new square creating its own separate threat. Because the defender can typically only respond to one threat at a time, one of the two attacking units will almost inevitably reap decisive material rewards."
        ],
        keyTakeaways: [
          "Discovered attacks create two simultaneous threats using one tempo.",
          "The unmasking front piece can make wild, 'free' moves because the opponent is distracted by the threat behind it.",
          "If the unmasked rear piece delivers check to the king, the front piece can capture anything it wants with impunity."
        ]
      },
      {
        heading: "The Unstoppable Double Check",
        subheading: "The Only Check in Chess That Cannot Be Blocked or Captured",
        paragraphs: [
          "If a discovered attack is dangerous, a **Double Check** is outright lethal. A double check occurs when the moving front piece delivers check, AND its departure unmasks a second check from the piece behind it simultaneously.",
          "The double check is unique in the rules of chess: **the king MUST move**. Why? Because a player cannot block two checking rays with a single piece, nor can they capture two checking pieces with one move. Even if the enemy has a queen ready to capture your unmasked bishop, if your jumping knight also checks the king, the queen cannot take the bishop because the king would remain in check from the knight. The opponent's entire army is rendered completely irrelevant; only the king's legs can save it."
        ],
        algebraicExample: {
          title: "Réti vs. Tartakower (Vienna 1910): The Queen Sac & Double Check",
          moves: "1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Nf6 5. Qd3 e5 6. dxe5 Qa5+ 7. Bd2 Qxe5 8. O-O-O Nxe4 9. Qd8+!! Kxd8 10. Bg5+! Kc7 11. Bd8#",
          explanation:
            "White sacrifices the queen on d8 to draw the king into an open corridor, then delivers double check with 10. Bg5+! (bishop check + rook on d1 check). Because it is double check, Black cannot capture the bishop on g5 and is checkmated on d8 next move."
        }
      },
      {
        heading: "The Windmill Tactic: The Eternal Discovered Engine",
        subheading: "Torre vs. Lasker, Moscow 1925, and Systematic Board Cleansing",
        paragraphs: [
          "Perhaps the most dazzling manifestation of the discovered check in chess history is the 'Windmill' (or 'Seesaw'). In this motif, a rook and a bishop work in cyclical harmony: the rook delivers check, steps away with a discovered check from the bishop, captures a piece, steps back with check, and repeats the cycle indefinitely.",
          "In the historic game Carlos Torre vs. Emanuel Lasker (Moscow, 1925), Torre sacrificed his queen to set up a rook-bishop windmill on the 7th rank. Torre's rook checked Lasker's king, hopped sideways to devour pawns and bishops with discovered check, and then returned to deliver check again, systematically stripping the former World Champion of his entire army in a span of six moves. Mastering the geometry of the windmill is essential for calculating long tactical sequences."
        ]
      },
      {
        heading: "Setting Up the Discovered Trap in Middle Games",
        subheading: "Masked Batteries on Central Files",
        paragraphs: [
          "To construct discovered attacks in your own games, look for opportunities to mask your long-range pieces behind your own minor pieces on central files. For example, placing a rook on e1 directly opposite the enemy king on e8, even while pawns and knights stand in between, creates an 'X-ray' battery.",
          "The moment the e-file opens, any hop of your e-file knight becomes a discovered threat against the black monarch. In the French Defense or Sicilian Defense, placing a queen on c2 behind a bishop on d3 eyeing the h7 square sets up lethal discovered attack pins against the castled king. Train your eyes to see through intervening pieces."
        ]
      }
    ],
    commonMistakes: [
      "Assuming an enemy queen will take your checking front piece, forgetting that double checks force the king to move.",
      "Moving the front piece to a square where it can be captured with check, defusing the uncovered attack.",
      "Failing to calculate king flight squares before executing a double check combination.",
      "Ignoring that the unmasked rear piece might be blocked by an opposing interposing piece that also attacks your rear piece."
    ],
    practicalTips: [
      "In any position where your long-range piece is lined up with the enemy king, evaluate every single move of the intervening piece.",
      "Remember: Double check ALWAYS forces a king move. If all king flight squares are covered, it is checkmate on the spot.",
      "Use discovered attacks to win 'hanging' pieces: the rear piece checks the king while the front piece scoops up an undefended minor piece.",
      "When defending, never allow your king or queen to linger on an open file opposite an enemy rook, even if friendly pieces stand between them."
    ]
  },
  {
    slug: "deflection-and-decoy",
    title: "Deflection & Decoy: Overloading Defenders in Tactical Puzzles",
    subtitle: "How to pry away vital guardians, exploit overloaded pieces, and drag enemy targets into lethal squares.",
    category: "Deflection & Overload",
    readTime: "10 min read",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-20",
    wordCount: 1160,
    summary:
      "When a single piece is assigned multiple defensive responsibilities, it is overloaded. Learn how deflection strips defenders away from critical squares, how decoys attract high-value targets into checkmate nets, and how to spot overloaded pieces in seconds.",
    sections: [
      {
        heading: "The Mechanics of the Overloaded Defender",
        subheading: "The Limits of Piece Capacity in Tactical Defense",
        paragraphs: [
          "Every chess piece operates under strict economy. A knight on f6 can comfortably guard the d5 square, OR it can guard the h7 pawn, but it cannot simultaneously defend both if attacks are launched against them in sequence. When a defending piece is burdened with protecting two critical squares or pieces at once, that piece is **overloaded**.",
          "Tactical masters exploit overloaded pieces by attacking one of the defended coordinates with a sacrifice or forcing trade. The defender is presented with an impossible dilemma: capture the attacking piece and abandon their other obligation, or ignore the attack and surrender material immediately. Overload is the conceptual foundation of almost all deflection combinations."
        ],
        keyTakeaways: [
          "An overloaded piece has two or more defensive duties that it cannot satisfy simultaneously.",
          "Deflection forces a defending piece to move away from guarding a critical square or teammate.",
          "Decoy forces a target piece (usually the king or queen) to step onto a fatal square where it can be forked or mated."
        ]
      },
      {
        heading: "Deflection: Removing the Sentinel",
        subheading: "Prying Open Fortified Back Ranks and Mating Nets",
        paragraphs: [
          "Deflection occurs when you force an enemy piece to abandon its defensive post. The classic scenario involves a back-rank mate where a black rook on f8 is the sole protector of the e8 entry square. White plays an unexpected queen sacrifice on another square (such as capturing an undefended bishop on c5 with the queen). If Black's rook captures White's queen, the back rank collapses with immediate checkmate.",
          "In competitive play, deflection is frequently accompanied by a discovered threat. If a defender is lured away by a forcing sacrifice, the second line of defense collapses like a house of cards."
        ],
        algebraicExample: {
          title: "The Adams vs. Torre Decoy Queen Sacrifice (New Orleans 1920)",
          moves: "1. Qg4! Qb5 2. Qc4! Qd7 3. Qc7! Qb5 4. a4! Qxa4 5. Re4! Qb5 6. Qxb7!",
          explanation:
            "White continuously offers the queen on squares where Black's queen cannot capture without abandoning the defense of the back-rank e8 rook, until Black's defense completely disintegrates."
        }
      },
      {
        heading: "Decoy Sacrifices: The Magnet Tactic",
        subheading: "Attracting Kings and Queens into Checkmate Nets",
        paragraphs: [
          "While deflection pushes a defender away from its post, a **decoy** (or attraction sacrifice) pulls a target piece onto a specific, fatal square. Decoys are the primary catalyst for smothered mates, royal forks, and king hunts.",
          "The most celebrated decoy in chess literature is the queen sacrifice in smothered mate: White plays 1. Qg8+!, forcing Black's rook to capture with 1... Rxg8 (the black king cannot capture because the queen is protected by a knight on f7). By pulling the black rook onto g8, White completely boxes in the black king. On the following move, White delivers 2. Nf7#, a pure smothered mate. The black rook was decoyed into becoming its own king's prison bars."
        ]
      },
      {
        heading: "Spotting Overloaded Defenders in Puzzle Feeds",
        subheading: "A 3-Step Mental Routine for Calculation",
        paragraphs: [
          "When solving tactical puzzles or calculating middle game combinations, cultivate the habit of mapping defensive lines. Ask yourself: 'What is holding this position together?' If Black's queen is guarding both a bishop on b4 and stopping a checkmate on g7, Black's position is teetering on a knife's edge.",
          "Attack the bishop on b4 with a rook or knight. If Black takes your piece, you deliver mate on g7. If Black preserves the mate on g7, you take the bishop for free. Once you begin seeing pieces not just as static units, but as tension lines under pressure, deflection tactics become blindingly obvious."
        ]
      }
    ],
    commonMistakes: [
      "Assuming a piece is overloaded when it can capture the attacker and maintain defense along an alternate ray.",
      "Failing to check whether the deflected defender can deliver a counter-check with tempo.",
      "Playing a decoy sacrifice without calculating all flight squares for the king.",
      "Miscounting the number of defenders on the secondary target after deflection is completed."
    ],
    practicalTips: [
      "Map out every piece on the board and identify which pieces have two or more defensive obligations.",
      "In puzzle feeds, if a piece looks impregnably defended, look for sacrifices that deflect the key guardian.",
      "Remember the smothered mate decoy: Qg8+ followed by Nf7# is one of the highest-frequency tactics in chess.",
      "Always calculate forcing captures first: a sacrifice that comes with check eliminates the opponent's counterplay options."
    ]
  },
  {
    slug: "chess-elo-rating-explained",
    title: "How Tactical Chess ELO Works & How to Break Plateaus",
    subtitle: "The mathematics of puzzle rating algorithms: calibration, difficulty variance, and training for pattern crystallization.",
    category: "ELO Training",
    readTime: "11 min read",
    publishedAt: "2026-11-17",
    updatedAt: "2026-11-20",
    wordCount: 1220,
    summary:
      "Why does tactical ELO fluctuate so sharply? How does DoomChess match your personal skill level against 6M+ Stockfish-verified positions? Discover the mathematics of Glicko/Elo calibration and the psychological habits that lead to sustainable chess mastery.",
    sections: [
      {
        heading: "The Mathematics of Chess Rating Systems",
        subheading: "From Arpad Elo's Statistical Model to Dynamic Puzzle Calibration",
        paragraphs: [
          "The Elo rating system, developed by physicist and chess master Arpad Elo in 1960, is a probabilistic framework designed to measure relative skill. In a contest between two entities, the difference in ratings predicts the expected outcome. If a 1600-rated player faces another 1600-rated player, the expected score for each is exactly 50%. If an 1800 player faces a 1400 player, the higher-rated combatant is expected to win roughly 91% of the time.",
          "In modern tactical training platforms like DoomChess, this same mathematical model applies to player-versus-puzzle interactions. Every puzzle in our 6.15-million-tactics database has its own dynamic Elo rating. When thousands of players attempt a puzzle, its rating adjusts automatically: if 1800-rated players consistently fail it, the puzzle's difficulty rating ascends to 1950. When you solve a puzzle correctly on the first attempt, you extract rating points based on the difference between your current rating and the puzzle's difficulty."
        ],
        keyTakeaways: [
          "Tactical Elo is not an absolute score; it is a statistical probability of success against a given puzzle difficulty.",
          "Puzzles earn and lose rating points exactly like human opponents based on real-world solve/fail ratios.",
          "Solving a puzzle higher than your rating yields substantial gains; failing an easy puzzle incurs steep rating penalties."
        ]
      },
      {
        heading: "The Onboarding Baseline and Adaptive Calibration",
        subheading: "Why Initial Rating Swings Settle into a Steady Growth Curve",
        paragraphs: [
          "When you first join DoomChess, the system initiates an onboarding calibration sequence. Because a brand-new account has high rating volatility (measured by the 'K-factor' in classical Elo, or Rating Deviation in Glicko models), your rating moves in larger jumps—often 30 to 50 points per puzzle.",
          "This wide volatility is intentional: it allows the algorithm to rapidly zoom in on your approximate tactical baseline (e.g., beginner 800, intermediate 1300, or advanced 1800+) without forcing you to slog through hundreds of trivial positions. Once your solve rate stabilizes near 55–65%, the rating volatility narrows, and point adjustments become steady and incremental (typically 8 to 15 points per puzzle). This equilibrium ensures you are consistently served puzzles right at the frontier of your calculation ability—the optimal 'zone of proximal development'."
        ]
      },
      {
        heading: "Accuracy vs. Speed: The Pattern Crystallization Trap",
        subheading: "Why Guessing Destroys Chess Intuition and How to Train Correctly",
        paragraphs: [
          "The greatest danger in vertical, short-form tactical practice is the temptation to blitz out the first plausible move that catches your eye. In social media feeds, rapid swiping is rewarded; in chess calculation, guessing is fatal to your rating and your tactical development.",
          "Grandmaster intuition is not magic—it is **pattern crystallization**. When a master looks at a board, their brain retrieves thousands of previously stored geometric chunks (fork alignments, king corridors, undefended minors). If you play the first move on intuition without calculating the opponent's strongest defense to the end of the line, you train your brain to accept superficial patterns. If you guess wrong, you lose rating points, deplete your battery quota, and miss the deeper pattern. To climb from 1200 to 1800 Elo, enforce a strict rule: **never move until you have visualized the opponent's reply and your subsequent winning response**."
        ],
        keyTakeaways: [
          "Calculate to the very end of the line: identify the opponent's best defensive resource before playing move one.",
          "A single thoughtful solve builds far more neural pattern recognition than five rapid, careless guesses.",
          "Use the hint feature strategically: spending half-Elo to understand a subtle move is superior to taking a full rating penalty on a blind blunder."
        ]
      },
      {
        heading: "Managing Tactical Fatigue and Spaced Repetition",
        subheading: "Why the Continuous Battery Model Produces Long-Term Rating Gains",
        paragraphs: [
          "Cognitive science shows that peak tactical calculation degrades rapidly under mental fatigue. After 15 to 20 consecutive demanding puzzles, calculation speed slows, blind spots multiply, and blunder rates spike. This is why marathon 4-hour puzzle sessions often end in severe rating crashes.",
          "DoomChess's dynamic battery system—recharging 1 puzzle every 16 minutes, reaching full 15-puzzle capacity in 4 hours—is specifically engineered to support spaced repetition. By engaging in two or three sharp, focused 10-minute tactical sprints throughout the day rather than one exhausting cram session, you encode chess patterns into long-term memory with dramatically higher retention and sustained Elo growth."
        ]
      }
    ],
    commonMistakes: [
      "Playing candidate moves on rapid impulse without calculating the opponent's sharpest defensive reply.",
      "Experiencing rating tilt: rushing through puzzles after a loss to win back lost Elo, leading to a downward spiral.",
      "Skipping puzzle reviews: closing a puzzle immediately after failing it without stepping through the winning continuation.",
      "Treating puzzle Elo as an ego metric rather than an adaptive training difficulty filter."
    ],
    practicalTips: [
      "Treat every puzzle like a tournament game: sit on your hands until you see the full combination through to completion.",
      "If you fail a puzzle, use the 'Step' review controls to inspect the alternate lines and understand why your chosen move fell short.",
      "Track your training streaks: solving 10 puzzles every day for a month yields 10x more Elo growth than solving 300 puzzles on a single Saturday.",
      "Review your bookmarked puzzles in the Practice tab: reviewing previously failed positions solidifies the corrected pattern in your intuition."
    ]
  },
  {
    slug: "endgame-opposition-basics",
    title: "King Opposition & Pawn Promotion Tactics Every Player Needs",
    subtitle: "The geometry of king battles: mastering direct opposition, outflanking, and the rule of the square.",
    category: "Endgame Tactics",
    readTime: "11 min read",
    publishedAt: "2026-11-18",
    updatedAt: "2026-11-20",
    wordCount: 1210,
    summary:
      "When the heavy pieces leave the board, the game is decided by pure geometry. Master the critical concepts of direct, distant, and diagonal king opposition, learn the rule of the square for pawn races, and never blunder a winning pawn endgame into a draw again.",
    sections: [
      {
        heading: "The Fundamental Concept of Opposition",
        subheading: "The Zugzwang Duel of Kings",
        paragraphs: [
          "In king and pawn endgames, when no minor or heavy pieces remain, the monarchs cease to be fragile targets and transform into ferocious fighting units. However, because kings cannot step onto adjacent squares under the rules of chess, a unique geometric tension arises when they face each other separated by a single square.",
          "This standoff is called **Opposition**. When two kings stand on the same file, rank, or diagonal with exactly one square between them, the player who does **NOT** have to move is said to 'have the opposition'. Why? Because chess is a game of compulsion: a player cannot pass their turn. The player whose turn it is must yield ground, stepping sideways or backward and allowing the opposing king to advance into enemy territory."
        ],
        keyTakeaways: [
          "Opposition means two kings face each other with exactly one square between them.",
          "The player who made the last move holds the opposition; the player whose turn it is must give way.",
          "Direct opposition occurs on files and ranks; diagonal opposition occurs on diagonals; distant opposition occurs over 3 or 5 squares."
        ]
      },
      {
        heading: "The Rule of the Square: Instant Pawn Race Calculation",
        subheading: "Calculating Pawn Breakthroughs Without Counting Moves",
        paragraphs: [
          "One of the most practical tactical shortcuts in all of endgame theory is the **Rule of the Square**. When an opponent has an isolated passed pawn running toward promotion, you do not need to mentally count: 'I move here, pawn moves there, I move here...'",
          "Instead, visualize a square on the chessboard where the pawn is one corner and the promotion square is another. If the pawn is on e4, the distance to promotion (e8) is 4 squares. Draw a 4x4 square from e4 to e8 and out to a4/a8 (or h4/h8 depending on which side the king stands). If the defending king can step inside this boundary box on its turn, it can catch and eliminate the pawn before it promotes. If the king cannot enter the square, the pawn will promote unimpeded."
        ],
        algebraicExample: {
          title: "King and Pawn vs. King: The Sixth-Rank Rule",
          moves: "1. Ke6! Ke8 2. d7+ Kd8 3. Kd6! (Stalemate if wrong! Must play: 1. d7+? Kd8 2. Kd6 Stalemate! Correct: 1. Ke6 Ke8 2. d7+ Kd8 3. Kd6 Draw / White King in front wins!)",
          explanation:
            "If the attacking king secures the square directly in front of its passed pawn on the 6th rank with opposition, promotion is mathematically guaranteed regardless of whose turn it is."
        }
      },
      {
        heading: "Outflanking: Breaking the Standoff",
        subheading: "How to March Your Passed Pawn to the 8th Rank",
        paragraphs: [
          "Holding the opposition is useless unless you know how to convert it into territory through **outflanking**. Once the defending king is forced to step to one side (e.g., Black's king steps from e8 to f8), the attacking king does not mirror it; instead, it steps diagonally forward on the opposite side (e.g., White's king marches to d7!).",
          "By seizing d7, the attacking king covers the c8, d8, and e8 promotion coordinates, building a secure escort corridor for the d-pawn to march straight into queenhood without Black's king ever being able to contest it."
        ]
      },
      {
        heading: "Avoiding the Dreaded Stalemate Trap",
        subheading: "The Critical Difference Between 6th and 7th Rank Pushes",
        paragraphs: [
          "Countless amateur games with a full pawn advantage end in tragic draws because of the classic corner stalemate trap. If you push your pawn to the 7th rank with check while your king stands on the 6th rank, the defending king simply steps into the corner or directly in front of the pawn.",
          "If your king moves up to defend the pawn, the defending king has no legal moves, resulting in an immediate stalemate draw. The fundamental rule of pawn promotion is: **the king must lead the pawn, not follow it**. Keep your king one square in front of your passed pawn until the promotion square is firmly under lock and key."
        ]
      }
    ],
    commonMistakes: [
      "Pushing the passed pawn ahead of the king instead of using the king to pioneer key squares.",
      "Blundering into stalemate on the 7th rank by delivering check with the pawn instead of controlling the promotion square with the king.",
      "Failing to calculate the Rule of the Square, wasting tempos chasing pawns that cannot be caught.",
      "Losing distant opposition by making impulsive king moves rather than maintaining odd-square separation."
    ],
    practicalTips: [
      "In king and pawn endings, remember: King on the 6th rank in front of its pawn always wins.",
      "Use the Rule of the Square instantly: if your king can step inside the square, do not panic.",
      "When outflanking, step opposite to the defender's move: if they go right, you step forward and left.",
      "Never rush to push your pawn; use your king to shoulder the enemy king away from the action."
    ]
  }
];

export function getGuideBySlug(slug: string): ChessGuide | undefined {
  return CHESS_GUIDES.find((g) => g.slug === slug);
}

export function getAllGuideSlugs(): string[] {
  return CHESS_GUIDES.map((g) => g.slug);
}

export function getGuidesByCategory(category: string): ChessGuide[] {
  return CHESS_GUIDES.filter((g) => g.category === category);
}
