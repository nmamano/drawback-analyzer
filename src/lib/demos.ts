// Demo game prefixes: legal SAN sequences that visibly eliminate several drawbacks, so
// a first-time user can see the product working. No fabricated claims — the notes only
// describe what the analyzer actually derives from these moves.

export interface Demo {
  id: string;
  label: string;
  note: string;
  moves: string[];
}

export const DEMOS: Demo[] = [
  {
    id: "queen-sortie",
    label: "Early queen sortie",
    note: "White's queen leaps to h5: rules out several White queen/move drawbacks at once.",
    moves: ["e4", "e5", "Qh5", "Nc6", "Bc4", "g6", "Qf3"],
  },
  {
    id: "recapture",
    label: "Pawn trade & recapture",
    note: "Black recaptures on d5 with the queen — rules out Black's no-recapture and queen-capture drawbacks.",
    moves: ["e4", "d5", "exd5", "Qxd5", "Nc3", "Qe5"],
  },
  {
    id: "knight-shuffle",
    label: "Knight moves twice & grabs f7",
    note: "White moves the same knight on consecutive turns and captures a pawn — rules out Truant, Quit Horsing Around, and capture drawbacks.",
    moves: ["Nf3", "Nc6", "Ng5", "Nf6", "Nxf7"],
  },
];
