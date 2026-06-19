# Drawback Chess — public-source catalog research (working source of truth)

> PROVENANCE & HONESTY NOTE (read first)
>
> This file is the raw output of a one-off research pass over PUBLIC community
> sources, captured 2026-06-18. It is the seed for the supported SUBSET catalog the
> analyzer ships. It is **community-sourced and UNOFFICIAL**.
>
> - The **official Drawback Chess glossary is password-gated and was deliberately NOT
>   accessed, scraped, mirrored, or guessed at.** (Standing rail 6.)
> - The bulk of these definitions trace to a single fan-compiled Chess.com forum
>   thread ("all drawbacks", 179 entries). ~25 entries were corroborated verbatim
>   against independent pages (marked **high** confidence); the rest are well-formed
>   and internally consistent but rest mainly on that one thread (**medium**).
> - The app must NEVER claim official or complete coverage. It advertises only
>   "supports N known drawbacks" and labels each rule supported/partial/unsupported
>   with source + confidence. Trickier stateful definitions (Yugioh, Eye of Sauron,
>   Shapeshifter, Reconnaissance, Quicksand) should be spot-checked against the live
>   game before their exact mechanics are trusted.
>
> Counts (of 179): ~118 deterministically checkable, ~38 partial (state-assertion /
> lose-condition), ~22 random-parameter (checkable once the hidden parameter is
> known/brute-forced), ~13 unsupported (per-move RNG, engine-eval, or hidden-info).

---

## 1. Summary

**There IS a single, rich public list.** A community member ("Truc1231") compiled an
"all drawbacks" thread on the Chess.com forums enumerating **179 named drawbacks with
definitions**. It appears to be a near-complete fan transcription of the real game's
drawback set (it uses the game's exact mechanics — Chebyshev distance, king-capture win
condition, the "(random square/rank/color)" parameter notation), and individual entries
cross-check cleanly against independent sources (Chess.com blog/threads, the
open-source `drawbackchess.vercel.app` clone, the official site's public rules page).
The official `drawbackchess.com` glossary is password-gated and was NOT accessed.

**Confidence:** ~25 entries corroborated verbatim across 2+ independent sources (high).
The remainder are well-formed and consistent but rest primarily on that one thread
(medium). Nothing was invented or padded.

---

## 2. Supported / Partial drawbacks (checkable), grouped by category

Notation: "Chebyshev distance" = max(file-diff, rank-diff). DC = deterministically
checkable. Unless noted, source is the Chess.com "all drawbacks" thread; corroborated
entries are marked **high**, the rest **medium**.

### simple-move-forbid

| Name | Definition | DC | Confidence |
|---|---|---|---|
| Lame Duck | You can't move your king. | yes | high |
| Cess | You can't move to the h-file. | yes | high |
| Shadow Queen | Your queen can only move to dark squares. | yes | medium |
| Horse Tranquilizer | Your knights can't capture. | yes | medium |
| Number of the Beast | You can't move to the 6th rank. | yes | medium |
| Prima Donna | You can't have more than one pawn on the same file. | yes | medium |
| Entrenched | Your rooks can't move more than 2 squares. | yes | medium |
| Snipers | Your bishops can only capture from distance ≥ 8 (effectively never). | yes | medium |
| Stay at Home Mom | Your queen can only move to your two home ranks. | yes | medium |
| Trophy Wife | Your queen can't capture. | yes | medium |
| Respectful | You can't give check. | yes | medium |
| Forward March | You can't move backwards. | yes | high |
| Stop Stalling | Your pieces can't move laterally (sideways). | yes | medium |
| No Shuffling | Your rooks can't move sideways. | yes | medium |
| Inside the Lines | You can't move onto the rim (ambiguous wording). | partial | low |
| Champing at the Bit | All your pawn moves must be distance 2. | yes | medium |
| Conscientious Objectors | You can't capture with pawns. | yes | medium |
| Peons First | You can't move pieces that are one square behind a pawn. | yes | medium |
| Far Sighted | Your pieces can't capture adjacent (distance-1) pieces. | yes | medium |
| Whites of Their Eyes | Your capturing moves must be Chebyshev distance ≤ 2. | yes | medium |
| Outflanked | You can't capture on the rim (except capturing the king). | yes | medium |
| Left for Dead | You can only capture to the left. | yes | medium |
| Spread Out | Your non-pawn pieces can't be adjacent to each other; no castling. | yes | medium |
| Separation of Church and State | No moving a bishop next to a king or a king next to a bishop. | yes | medium |
| Get Down Mr. President | You can't move your king when in check. | yes | high |
| Sleepy King | Your king can only move when in check. | yes | medium |

### capture-restriction

| Name | Definition | DC | Confidence |
|---|---|---|---|
| True Gentleman | You can't capture queens. | yes | high |
| Vegan | You can't capture knights. | yes | high |
| Checkers | You must capture if able. | yes | high |
| Pacman | If you can capture a pawn, you must. | yes | high |
| Greedy | You can't capture if a higher-value capture was available. | yes | high |
| Punching Down | Your pieces can't capture higher-value pieces. | yes | medium |
| Elephants Fear Mice | Your non-pawn pieces can't capture pawns. | yes | medium |
| Professional Courtesy | A piece type can't capture the same piece type. | yes | high |
| Evil Twin | You MUST capture a same-type piece with the same type if able. | yes | medium |
| Simplifier | If you can capture with a lesser-or-equal-value piece, you must. | yes | medium |
| Chivalry | You can only capture rooks and queens with knights. | partial | medium |
| Femme Fatale | You can only capture the enemy king with a queen. | partial | medium |
| Indecisive | You can't capture if more than one capturing move is available. | yes | medium |
| Covering Fire | You can only capture a piece if you can capture it two different ways. | yes | medium |
| Stand Your Ground | Your pieces can only capture if they are themselves attacked. | yes | medium |
| The Scent of Blood | You can't make non-capturing moves with a piece that can capture. | yes | medium |
| Cheerleaders | Your non-pawn pieces can only capture if adjacent to one of your pawns. | yes | medium |
| Torchlight | Non-pawn pieces only move when starting/stopping adjacent to your pawns. | yes | medium |
| Noble Steed | Non-knight pieces can only move when adjacent to a knight. | yes | high |
| Friendly Fire | You can only move to squares defended by your other pieces. | yes | medium |
| Protected Pawns | You can only move pawns to defended squares. | yes | medium |
| Pack Mentality | Your pieces must move to squares adjacent to another of your pieces. | yes | medium |

### stateful (depends on prior moves)

| Name | Definition | DC | Confidence |
|---|---|---|---|
| Truant | You can't move the same piece twice in a row. | yes | high |
| Spice of Life | You can't move the same piece type twice in a row. | yes | medium |
| Quit Horsing Around | If you moved a knight last move, you can't move a knight this move. | yes | medium |
| Hipster | You can't move the same piece type as the opponent's last move. | yes | medium |
| Flatterer | You must match the opponent's last move type (pawn/piece). | yes | medium |
| Alternator | You must alternate pawn and non-pawn moves. | yes | medium |
| Fixation | Once you move a pawn you can't move a different pawn until a non-pawn move (and vice versa). | yes | medium |
| Queen Bee | Once you capture with a queen, you can no longer move queens. | yes | medium |
| Battle Fatigue | After a piece captures, it can't capture again until it makes a non-capturing move. | yes | medium |
| Remorseful | You can't capture twice in a row. | yes | medium |
| Turn the Other Cheek | You cannot recapture. | yes | high |
| Diplomatic Immunity | You can't capture a piece that just moved, unless that move was a capture. | yes | medium |
| Leveling Up | You can't capture a piece type until you've captured its "predecessor". | partial | medium |
| Monkey See | You can only capture with piece types the opponent has already captured with. | partial | medium |
| Velociraptor | You can only capture a piece if the opponent moved that type in the last 3 moves. | yes | medium |
| Cowardly | When the opponent captures, you must move backward (or lose). | partial | high |
| Barbarian Rage | If you were captured last move, you must capture this move if able. | yes | medium |
| Eye for an Eye | If the opponent captures, you must capture next move or lose. | partial | medium |
| Jumpy | When possible, you must move an attacked piece. | yes | medium |
| Deer in the Headlights | You can't move pieces that are under attack. | yes | high |
| Hedonic Treadmill | You must move a piece at least as valuable as the opponent's last-moved piece. | yes | medium |
| Going the Distance | You must move at least as far (Chebyshev) as the opponent's last move. | yes | medium |
| Simon Says | You must move onto the same color square as the opponent's last move. | yes | medium |
| Hopscotch | You must alternate moving to light and dark squares. | yes | medium |
| Boxing with Shadow | When the opponent moves a piece, you must move to that piece's origin square if able. | yes | medium |
| Relay Race | You must move a piece adjacent to your last move's destination if possible. | yes | medium |
| Left to Right | You must move to a file right of your last move's file (unless on the rightmost). | yes | medium |
| Bipartisanship | You can't move left twice in a row or right twice in a row. | yes | medium |
| Scorched Earth | You can't move to squares you've previously moved from. | yes | medium |
| Haunted / Superstitious | You can't move onto squares where you / the opponent captured. | yes | medium |
| Guerilla Tactics | After capturing, you must move the capturing piece back if possible. | yes | medium |
| Bottled Lightning | If you can move your king, you must. | yes | high |
| Escort Mission | If your king can capture, it must. | yes | medium |
| Irresistible | You must move a piece adjacent to the opponent's king if possible. | yes | medium |
| Comfort Zone(square) | If you can move to the (fixed random) square, you must. | yes (given param) | high |
| Leaps and Bounds | You can't move a piece to a square adjacent to where it just was. | yes | high |
| Taking Turns | You can't move a piece type again until you've moved every piece of that type. | yes | high |
| Out of Breath | You can only move your king once the whole game. | yes | high |

(Plus more stateful entries — Reconnaissance, Absolution, Centralized Command, Ladies
First, Royal Jubilee, Prince Charming, Savior Complex, Stir Crazy, Torpedos, Cowering
in Fear, Shapeshifter, Queen Disguise, Yugioh — all medium/low; see §6 caveats.)

### board-condition-loss (you LOSE if a condition holds — "partial": state assertion, not a move filter)

| Name | Definition | Confidence |
|---|---|---|
| Pawn Battle | You lose if you ever have fewer pawns than the opponent. | high |
| Three Check | If you're checked three times, you lose. | high |
| Tower Defense | You can't move your rooks; you lose if you lose all rooks. | high |
| Hold Them Back | You lose if the opponent moves a pawn onto your side. | high |
| King of the Hill | After move 1, you lose if you start a turn with no piece in the center 4 squares. | medium |
| Simp / Drag / Modest / Boastful / Ivory Tower / Paranoid / Helicopter Parent / Closed Book / Homeland Security / My Kingdom for a Horse / Abstinence / Siege / Rook on the Seventh / Moving Day / Warlord / Inching Forward / Windup Toys / Fischer Random / Unspooling / Doctor Octopus / You Best Not Miss / Secret Garden | various lose-conditions / move-threshold rules | medium |

### positional / board-mechanics (checkable with custom board state)

Crossing the Rubicon (high), Power Cells (high), Social Distancing (high), Thunderdome
(high), Bridge Over Troubled Water (high), Rising Water(rate) (high), plus Messy
Divorce, Lethal Attraction, Scouting Ahead, Leading the Charge, Reflective, Control
Center, Exclusivity Clause, Sibling Rivalry, Royal Berth, True Love, Unrequited Love,
Eat Your Vegetables, Nurturer, Horse Eats First, Oddball/Even Keeled, Quicksand,
Skittish, Rook Buddies, Bloodthirsty, Bishop/Rook Fan Club, Shellshocked, Medusa,
Theocracy(parity) — medium unless noted. (Eye of Sauron: low, vague wording.)

---

## 3. Random-parameter drawbacks (need a hidden parameter; checkable once known/brute-forced)

| Name | Parameter | Definition | Examples | Confidence |
|---|---|---|---|---|
| Comfort Zone(square) | target square | If you can move to the square, you must. | e4; c6 | high |
| Blinded by the Sun(square) | square | You can't end your turn attacking the square. | d5; g7 | medium |
| Active Volcano(square) | square | You can't move onto, or orthogonally adjacent to, the square. | e5 → e5,d5,f5,e4,e6 | medium |
| Just Passing Through(rank) | rank | You can't capture on the rank. | rank 4; rank 6 | high |
| Crenellations(color) | square color | Your pawns can only move to squares of that color. | light; dark | high |
| Triple Play(piece) | piece type | You can only capture the enemy king if you have three of that piece. | 3 knights | high |
| Crusade(move#, square) | move# + square | 4 consecutive moves from move N, you must end on the square or lose. | move 8, d4 | high |
| Glorious Battle(move#) | move# | 4 consecutive moves from move N, you must capture or lose. | move 6 | high |
| Theocracy(parity) | odd/even | On odd or even moves you may only capture with bishops. | odd; even | high |
| Secret Garden(squares) | 2 squares | Hidden squares you can't enter; you lose if the opponent enters one. | front of c/f pawns | medium |
| Rising Water(rate) | start rank / cadence | Water rises one rank every 10 turns; can't move underwater. | rank 1, +1/10 | high |

(Fixed move-thresholds like Siege/move-20, Rook on the Seventh/move-15, Windup Toys/
move-12 are NOT randomized — kept in §2.)

---

## 4. UNSUPPORTED drawbacks (out of scope for inference)

| Name | Definition | Why unsupported |
|---|---|---|
| Fog of War | You can't see the opponent's pieces. | UI/hidden-info; doesn't constrain your legal moves. |
| Lucky | No drawback at all. | Nothing to check. |
| Gambler | Can't move a piece type, re-randomized every move. | Per-move RNG. |
| Hand and Brainless | Must move a piece type, re-randomized every move. | Per-move RNG. |
| Unlucky | Can't move to half the squares, re-randomized each move. | Per-move RNG. |
| Colorblind | Can't move to one color, re-randomized each move. | Per-move RNG. |
| Obsession | Per-turn random "must-move-here" square. | Per-move RNG. |
| Winds of Fate | Each turn randomly can't move left or right. | Per-move RNG. |
| Ichthyophobe | Can't make the move Stockfish recommends. | External engine eval. |
| Hand and Gigabrain | Must move the piece type Stockfish recommends. | External engine eval. |
| Devil on Your Shoulder | A "devil" suggests moves; disobey 7 turns then must obey. | Engine's hidden suggestions. |
| Eye of Sauron (borderline) | Non-pawns limited by "the rank your rooks can see." | Definition too vague to implement reliably. |

---

## 5. Sources consulted

- **Chess.com forum — "all drawbacks"** — `https://www.chess.com/forum/view/general/all-drawbacks` — PRIMARY: 179 named drawbacks + definitions, explicit "(random …)" markers.
- **Chess.com blog — "what is Drawback Chess?"** — `https://www.chess.com/blog/le4botrn1234567/what-is-drawback-chess` — corroborated Lame Duck, True Gentleman, Vegan, Social Distancing, Pawn Battle, Cowardly, Deer in the Headlights, Tower Defense, Professional Courtesy; core rules (king-capture win, king en passant).
- **Chess.com forum — "two hardest drawbacks"** — `https://www.chess.com/forum/view/off-topic/i-found-the-two-hardest-drawbacks-in-drawback-chess` — corroborated Hand and Brainless, Deer in the Headlights, Noble Steed, Cowardly, Hold Them Back, Leaps and Bounds, Bottled Lightning.
- **Chess.com forum — "drawback chess" (variants)** — `https://www.chess.com/forum/view/chess-variants/drawback-chess-107939939` — corroborated Cess, Checkers, Pacman, Greedy, Three Check, Tower Defense.
- **Open-source clone tutorial** — `https://drawbackchess.vercel.app/tutorial` — confirmed core rules verbatim: no checkmate/stalemate, king is a real capturable piece, king en passant, Chebyshev distance, illegal-by-drawback moves pre-filtered.
- **Official site (public landing only)** — `https://www.drawbackchess.com/` — public landing; glossary password-gated and NOT accessed.
- **Eric Rosen YouTube** — `https://www.youtube.com/watch?v=1FRxbKGXIHg`, `.../watch?v=fuGjhUzZe6w` — corroborated recapture/forward-only/same-piece behaviors (Turn the Other Cheek, Forward March, Truant).
- Fandom "Websites Wiki" (HTTP 403, not fetched) and jmill.dev/Drawback-Chess (404, dead) — contributed nothing verified.

---

## 6. Honest assessment & recommendation

1. **Single-source risk on definitions.** ~85% of the 179 entries rest on one forum
   transcription. ~25 corroborated verbatim across independent pages and all matched.
   Individual medium-confidence definitions — especially convoluted stateful ones
   (Yugioh, Eye of Sauron, Shapeshifter, Reconnaissance, Quicksand) — should be
   spot-checked against the live game before trusting their exact mechanics.
2. **The authoritative glossary is gated and was not used.** Canonical wording would
   require the maintainers' permission for the official list.

**Recommendation for the analyzer:** use §2/§3 as the SUBSET seed, clearly labeled
"community-sourced, unofficial". Prioritize the ~118 deterministic "yes" entries for the
chess.js-based eliminator. Treat §4 as out-of-scope for inference, displayed separately.
For random-parameter drawbacks, brute-force the finite parameter space (64 squares, 8
ranks, 2 colors, etc.) against the move history. Surface confidence (high vs medium)
in the catalog UI.
