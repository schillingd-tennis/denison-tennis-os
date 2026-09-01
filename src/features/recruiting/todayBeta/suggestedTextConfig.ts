/**
 * Suggested Text v0.1 templates (Today Beta). Adjust wording here only.
 */
export const SUGGESTED_TEXT_TEMPLATES = {
  strong_win: "Great win today{name}. That's a really good player you beat. Congrats!",
  good_win: "Great win{name}. Really good result today — congrats!",
  routine_win: "Congrats on the win today{name}. Keep it going!",
  strong_tournament_run: "Great run this week{name}. Really impressive tournament.",
  tough_loss_strong_opponent:
    "Tough one today{name}, but that's a really good player. Keep competing.",
  cadence_general: "Hey{name}, just checking in. How are things going?",
  cadence_no_contact: "Hey{name}, wanted to check in and see how things are going.",
  upcoming_tournament_imminent: "Good luck this week{name}. I'll be following along.",
  upcoming_tournament_soon: "Good luck this week{name}. Hope you have a great tournament.",
} as const;

/** Late-round tokens that qualify for tournament-run messaging. */
export const LATE_ROUND_TOKENS = new Set(["SF", "F", "SEMIFINAL", "FINAL", "FINALS", "SEMIFINALS"]);

/** Minimum NEW wins in the same tournament to qualify for tournament-run messaging. */
export const TOURNAMENT_RUN_MIN_NEW_WINS = 2;
