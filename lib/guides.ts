export interface GuideSection {
  heading: string;
  subheading?: string;
  paragraphs: string[];
  keyTakeaways?: string[];
}

export interface ChessGuide {
  slug: string;
  title: string;
  subtitle: string;
  category: "Forks" | "Pins & Skewers" | "Checkmate Patterns" | "Discovered Attacks" | "ELO Training";
  readTime: string;
  publishedAt: string;
  updatedAt: string;
  summary: string;
  sections: GuideSection[];
  practicalTips: string[];
}

export const CHESS_GUIDES: ChessGuide[] = [
  {
    slug: "mastering-the-knight-fork",
    title: "Mastering the Knight Fork: Geometry, Tactics, and Royal Attacks",
    subtitle: "How to harness the non-linear leap of the knight to pick apart enemy defenses and capture heavy material.",
    category: "Forks",
    readTime: "6 min read",
    publishedAt: "2026-11-15",
    updatedAt: "2026-11-20",
    summary:
      "Unlike linear pieces whose lines of attack can be blocked or countered along ranks and diagonals, the knight operates in an L-shaped trajectory that leaps cleanly over obstacles. Learn how to manufacture decisive knight forks against the king, queen, and rooks in rapid-fire play.",
    sections: [
      {
        heading: "The Unique Geometry of the Knight",
        subheading: "Why Knights Disobey Classical Line-of-Sight Principles",
        paragraphs: [
          "In chess calculation, linear pieces—rooks, bishops, and queens—demand unobstructed pathways to exert their power. A bishop requires an open diagonal; a rook requires an open file. If an enemy pawn stands in their line of sight, their immediate threat is blunted. The knight, however, is the only piece on the 64 squares capable of jumping over occupied squares. Its unique (2,1) orthogonal leap allows it to strike without needing a clear lane.",
          "This geometric idiosyncrasy makes the knight the ultimate tactical ambush weapon. A knight fork occurs when a single knight attacks two or more enemy pieces simultaneously. Because the knight cannot be blocked, the defender is stripped of interposition defenses: they cannot slide a pawn or minor piece between the attacker and the target. When one of the attacked pieces is the king, the defender must respond to check immediately, often surrendering whatever other piece shares the knight's lethal perimeter."
        ],
        keyTakeaways: [
          "Knights always change square colors with every move: a knight on a dark square only attacks light squares, and vice versa.",
          "Knights cannot be blocked by interposition; only capture or flight can neutralise a knight check.",
          "Pieces residing on the same colored square two squares away diagonally or horizontally are prime targets for a knight fork."
        ]
      },
      {
        heading: "The Anatomy of High-Value Forks",
        subheading: "From the Humble Pawn Fork to the Royal Family Fork",
        paragraphs: [
          "While forking a pair of undefended pawns wins modest endgame advantages, tactical calculation in rapid play centers on high-impact targets. The most famous is the 'Royal Fork'—a knight delivering check to the enemy king while simultaneously attacking the enemy queen. Under FIDE laws, check overrides all other tactical considerations. The king must move (or the knight must be captured), guaranteeing the demise of the queen on the following ply.",
          "An even more devastating pattern is the 'Family Fork', where an aggressively centralized knight attacks the king, queen, and a rook in a single stroke. Consider the infamous c7 outpost in open Sicilian or French structures: if black leaves their king on e8 and queen on d8, a white knight landing on c7 checks the king, attacks the queen on d8, and simultaneously targets the rook on a8. Recognizing the geometric relationship between the e8-king and a8-rook is one of the quickest ways to harvest easy Elo points."
        ]
      },
      {
        heading: "Manufacturing the Fork: Deflection and Decoys",
        subheading: "Great Tactical Players Do Not Wait for Forks; They Force Them",
        paragraphs: [
          "In high-level tactical chess, opponents rarely hand you fork targets on adjacent squares voluntarily. Instead, tactical masters engineer the fork by coercing enemy pieces onto vulnerable coordinates using sacrifice, deflection, and decoy sacrifices.",
          "The most frequent technique is the king attraction sacrifice. Suppose Black has a queen on d7 and king on g8, with an outpost square on e6. A direct check on e6 accomplishes nothing if the king simply ignores it. However, if White plays a sacrifice such as Bxf7+ or a rook sacrifice on the 8th rank that compels the black king to step onto f7, White follows up with Ne5+, checking the newly positioned king while simultaneously snapping up the queen on d7. The fork was not present on move one; it was constructed through forcing moves."
        ],
        keyTakeaways: [
          "Look for forcing checks that drag the enemy king onto the same color complex as their queen or rook.",
          "Check whether eliminating a key defender allows your knight to pivot into a hole in the opponent's pawn structure.",
          "Always calculate forcing captures first: checks, captures, and queen threats create the geometric alignment for the fork."
        ]
      },
      {
        heading: "Defending Against the Knight: The Color Rule",
        subheading: "How to Keep Your Heavy Pieces Immune from Knight Attacks",
        paragraphs: [
          "To avoid falling victim to knight forks, top grandmasters rely on the fundamental knight parity rule: a knight always alternates square colors with every hop. If your king and queen sit on opposite colored squares, an enemy knight can never attack both of them in a single move.",
          "When coordinating your king and queen in an endgame or double-rook complex, aim to position your pieces on opposite color squares when an active enemy knight lurks nearby. Furthermore, a knight stationed on the rim has only 3 or 4 potential squares of control, whereas an octopus knight on d5 or e5 controls 8 critical squares. Restricting knight mobility through pawn levers (like playing a6 and b5 to deny c6 and d5 outposts) neutralises the threat before it ever materialises."
        ]
      }
    ],
    practicalTips: [
      "Memorize the knight parity rule: if your heavy pieces share the same square color, scan immediately for potential knight fork coordinates.",
      "Outposts on the 5th and 6th ranks (especially c7, d6, e6, and f7) are prime launchpads for royal forks.",
      "In time trouble, calculate king-attraction sacrifices first: a temporary minor piece sacrifice that forces the king into a fork yields massive material returns.",
      "When evaluating tactical puzzles, check every move where the knight delivers check; often the secondary target is hidden behind a quiet square."
    ]
  },
  {
    slug: "back-rank-mate-traps-defenses",
    title: "Back-Rank Mate Traps, Defenses, and Luft in Practical Play",
    subtitle: "Mastering the corridor mate: how to exploit trapped castled kings and ensure your own back rank remains impregnable.",
    category: "Checkmate Patterns",
    readTime: "7 min read",
    publishedAt: "2026-11-15",
    updatedAt: "2026-11-20",
    summary:
      "A castled king shielded by its own un-moved pawns can become a self-imposed prison. Discover how back-rank mate combinations unfold, how deflection sacrifices pry open the 8th rank, and when to spend a tempo carving out critical escape squares.",
    sections: [
      {
        heading: "The Mechanics of the Corridor Mate",
        subheading: "When Friendly Pawns Turn into Executioners",
        paragraphs: [
          "Castling is the gold standard of king safety in chess: it whisks the monarch away from dangerous central open files and tucks it behind an intact shield of pawns on f2-g2-h2 (or f7-g7-h7). However, that very defensive wall can transform into a fatal corridor if the back rank is neglected. If a heavy piece—a rook or a queen—penetrates the final rank, and the king has no forward squares to escape to, checkmate is instantaneous.",
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
        subheading: "Breaking Down Apparent Back-Rank Protection",
        paragraphs: [
          "Beginner players often assume that having a single rook stationed on d8 or e8 makes their back rank immune to attack. Tactical masters know better: that single defender is vulnerable to deflection, overload, and decoy combinations.",
          "Imagine a scenario where Black has a rook on e8 and queen on d6, while White has a rook on e1 and queen on c3. If White plays the shocking 1. Qxe5!!, White attacks Black's queen while offering its own queen as bait. If Black plays 1... Qxe5, White lands the devastating 2. Rxe8+ Rxe8 3. Rxe8# on the back rank. Black's queen was the only piece preventing the back rank breakthrough, and once deflected, the entire defense collapsed. Whenever a back rank defender is also tasked with protecting an outpost or minor piece, it is 'overloaded' and ripe for exploitation."
        ]
      },
      {
        heading: "The Power of the Zwischenzug (In-Between Move)",
        subheading: "Interposing Threats Before the Final Execution",
        paragraphs: [
          "Back-rank combinations frequently hinge on intermediate moves known as Zwischenzüge. Suppose your opponent thinks they have escaped checkmate by delivering an intermediate check of their own. A sharp tactician anticipates this counter-blow and ensures that every step in the back-rank sequence is completely forcing.",
          "A classic example is the sacrifice on the back rank followed by a double-threat check. For example, playing 1. Rd8+ Rxd8 2. Qxd8+ Nxd8 3. Rxd8#. If the defending pieces are simply lined up in passive defense, a cascade of exchanges on the key entry square cleans the board until the monarch has nowhere left to turn."
        ],
        keyTakeaways: [
          "Calculate the exact number of attackers versus defenders on the critical entry square (e.g., d8, e8, f8).",
          "Identify whether any back-rank defender has a secondary obligation, such as guarding a bishop or stopping a fork.",
          "Queen sacrifices on the back rank are among the highest-percentage motifs in tactical puzzle databases."
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
    practicalTips: [
      "Whenever you see an opponent with pawns on f7, g7, and h7 with no pieces on the 7th rank, evaluate back-rank sacrifices immediately.",
      "Look for rook battery setups on open files: doubling rooks on the d-file creates irresistible pressure on the final rank.",
      "Do not push your Luft pawn blindly; wait until minor pieces are traded and the threat of an open-file invasion becomes concrete.",
      "If you are defending and cannot afford the tempo for Luft, tuck a knight or bishop back to f8/e8 to shield the king and guard escape squares."
    ]
  },
  {
    slug: "absolute-vs-relative-pins",
    title: "Absolute vs. Relative Pins: Exploiting Frozen Pieces",
    subtitle: "Learn the crucial legal and strategic boundaries of pins, and discover how to systematically pile pressure on paralyzed targets.",
    category: "Pins & Skewers",
    readTime: "8 min read",
    publishedAt: "2026-11-16",
    updatedAt: "2026-11-20",
    summary:
      "A pinned piece loses its mobility, its defensive power, and its tactical value. Understand the essential difference between absolute pins (enforced by the rules of chess) and relative pins (enforced by material arithmetic), and learn the golden rule of tactical pressure.",
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
        ]
      },
      {
        heading: "The Golden Tactical Rule: Pile On the Pinned Piece",
        subheading: "Never Trade for a Pinned Piece When You Can Attack It Again",
        paragraphs: [
          "When beginner and intermediate players identify a pinned piece, their instinct is often to capture it immediately. For example, if White's bishop pins Black's knight to the king on c6, White frequently plays Bxc6+ right away. This is almost always a tactical inaccuracy.",
          "The golden rule of pins is: **Pile up the pressure on the pinned piece until it collapses.** Because the pinned piece cannot flee, you have time to bring additional attackers to bear on it. Attack it with a pawn (the cheapest possible attacker), double rooks behind your pinning piece, or reposition a knight into the fray. If a piece is defended twice but pinned, adding a third attacker guarantees winning material on your terms."
        ],
        keyTakeaways: [
          "Do not rush to trade your pinning piece; add more attackers to the pinned target first.",
          "Attack pinned pieces with pawns whenever possible: winning a minor piece for a pawn is an enormous material edge.",
          "Watch out for counter-pins and unpinning tactics that relieve the pressure with check."
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
    practicalTips: [
      "Always verify whether a defending piece is absolutely pinned before calculating exchanges: an absolutely pinned piece has zero defending power.",
      "Look for pawn pushes against pinned minor pieces (e.g., d5 against a pinned knight on c6): pawns are the ultimate pin breakers.",
      "Beware of relative pins against your queen: always calculate whether moving the pinned piece with check or mate justifies the sacrifice.",
      "In puzzle solving, if you spot an enemy piece aligned with their king or queen, search for an immediate rook or bishop pin."
    ]
  },
  {
    slug: "the-skewer-winning-material",
    title: "The Skewer: Winning Heavy Material Through the King",
    subtitle: "The inverted pin: forcing the most valuable enemy piece to step aside and harvesting the defenseless target behind it.",
    category: "Pins & Skewers",
    readTime: "6 min read",
    publishedAt: "2026-11-16",
    updatedAt: "2026-11-20",
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
        ]
      },
      {
        heading: "Bishop Diagonal Skewers: The Long-Distance Spear",
        subheading: "Exploiting King and Queen Alignments on Untamed Diagonals",
        paragraphs: [
          "Bishops are deadly skewer specialists on open diagonals, particularly when the enemy king and queen are caught on the same color complex. For instance, if Black's queen sits on b7 and king on f3 on the long a8-h1 diagonal, a white bishop swooping into d5 checks the king. The king has no choice but to step out of check, leaving the queen on b7 completely exposed to the bishop's follow-up capture.",
          "Diagonal skewers frequently catch players off guard because diagonals span vast distances across the board. A quiet bishop sitting on c1 can suddenly leap to g5 or a3, skewering a king on e7 and a rook on h8 or c8. Always scan both diagonals of your bishops for high-value targets sharing a line."
        ],
        keyTakeaways: [
          "Check whether the enemy king and queen share the same diagonal, rank, or file.",
          "Rooks deliver linear skewers along ranks and files; bishops deliver diagonal skewers.",
          "Always calculate whether the fleeing front piece can defend the rear piece as it steps away (e.g., Kd6 defending a rook on d7)."
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
    practicalTips: [
      "In rook endgames, never place your king and rook on the same rank or file without calculating opponent rook checks first.",
      "When your opponent's king and queen are on the same diagonal, evaluate all bishop checks immediately.",
      "If you are skewered, check whether your fleeing front piece can land on a square that protects the piece behind it.",
      "When training on DoomChess reels, look for skewers whenever the opponent's king is forced onto the perimeter of the board."
    ]
  },
  {
    slug: "discovered-attacks-double-checks",
    title: "Discovered Attacks and Double Checks: Chess's Most Lethal Weapons",
    subtitle: "How to coordinate an ambush battery: unleashing simultaneous threats that completely overwhelm enemy defensive resources.",
    category: "Discovered Attacks",
    readTime: "7 min read",
    publishedAt: "2026-11-17",
    updatedAt: "2026-11-20",
    summary:
      "When a piece moves out of the way to uncover an ambush attack from a teammate behind it, chaos ensues. When both pieces attack simultaneously in a Double Check, the king has only one legal remedy: to run for its life. Learn how to engineer this devastating tactic.",
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
        ]
      },
      {
        heading: "The Windmill Tactic: The Ultimate Discovered Engine",
        subheading: "Torre vs. Lasker, Moscow 1925, and Eternal Check",
        paragraphs: [
          "Perhaps the most dazzling manifestation of the discovered check in chess history is the 'Windmill' (or 'Seesaw'). In this motif, a rook and a bishop work in cyclical harmony: the rook delivers check, steps away with a discovered check from the bishop, captures a piece, steps back with check, and repeats the cycle indefinitely.",
          "In the historic game Carlos Torre vs. Emanuel Lasker (Moscow, 1925), Torre sacrificed his queen to set up a rook-bishop windmill on the 7th rank. Torre's rook checked Lasker's king, hopped sideways to devour pawns and bishops with discovered check, and then returned to deliver check again, systematically stripping the former World Champion of his entire army in a span of six moves. Mastering the geometry of the windmill is essential for calculating long tactical sequences."
        ],
        keyTakeaways: [
          "Double check forces the king to move: no interposition, no capture of the checking piece.",
          "A discovered check gives the front piece total license to hunt unprotected pieces anywhere on the board.",
          "Always scan for battery alignments between your queen/rook/bishop and the enemy king or queen."
        ]
      },
      {
        heading: "Setting Up the Discovered Trap",
        subheading: "Masked Batteries in Opening and Middlegame Play",
        paragraphs: [
          "To construct discovered attacks in your own games, look for opportunities to mask your long-range pieces behind your own minor pieces on central files. For example, placing a rook on e1 directly opposite the enemy king on e8, even while pawns and knights stand in between, creates an 'X-ray' battery.",
          "The moment the e-file opens, any hop of your e-file knight becomes a discovered threat against the black monarch. In the French Defense or Sicilian Defense, placing a queen on c2 behind a bishop on d3 eyeing the h7 square sets up lethal discovered attack pins against the castled king. Train your eyes to see through intervening pieces."
        ]
      }
    ],
    practicalTips: [
      "In any position where your long-range piece is lined up with the enemy king, evaluate every single move of the intervening piece.",
      "Remember: Double check ALWAYS forces a king move. If all king flight squares are covered, it is checkmate on the spot.",
      "Use discovered attacks to win 'hanging' pieces: the rear piece checks the king while the front piece scoops up an undefended minor piece.",
      "When defending, never allow your king or queen to linger on an open file opposite an enemy rook, even if friendly pieces stand between them."
    ]
  },
  {
    slug: "how-tactical-elo-ratings-work",
    title: "How Tactical ELO Ratings Work: Calibration, Difficulty, and Rating Growth",
    subtitle: "The science of chess rating algorithms: understanding your puzzle rating, avoiding plateau traps, and training for pattern crystallization.",
    category: "ELO Training",
    readTime: "8 min read",
    publishedAt: "2026-11-17",
    updatedAt: "2026-11-20",
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
    practicalTips: [
      "Treat every puzzle like a tournament game: sit on your hands until you see the full combination through to completion.",
      "If you fail a puzzle, use the 'Step' review controls to inspect the alternate lines and understand why your chosen move fell short.",
      "Track your training streaks: solving 10 puzzles every day for a month yields 10x more Elo growth than solving 300 puzzles on a single Saturday.",
      "Review your bookmarked puzzles in the Practice tab: reviewing previously failed positions solidifies the corrected pattern in your intuition."
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
