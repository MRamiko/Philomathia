// Show real poster/cover URLs (items.poster_url) instead of gray boxes.
export const SHOW_IMAGES = true;
export const COLD_GEORGIAN_EVERY = 5;
export const CANDIDATE_LIMIT = 300;

// Recommendation scoring constants. These are reasonable defaults, not proven optimal.
export const REC = {
  W_TAG: 0.5,
  W_CREATOR: 0.2,
  W_MOOD: 0.2,
  W_NOVELTY: 0.1,
  LIKE_DELTA: 3,
  PASS_DELTA: -2,
  HIGH_RATING_DELTA: 2,
  LOW_RATING_DELTA: -2,
  ONBOARD_DELTA: 2,
  EXPLORE_EVERY: 5, // about 1 in 5 cards is exploratory
  TOP_TAGS_FOR_EXPLORE: 10,
  DECAY: 0.97,
  SHORT_BLEND: 0.5,
  RECENT_PER_ACTION: 10,
  RECENT_LIKES: 5,
  TAG_CAP: 0.25,
  OVERLAP_BONUS: 0.05,
  CROSS_MEDIA: 0.5,
  MAX_GENRE_RUN: 3,
  QUEUE_SIZE: 5,
  PAGE_SIZE: 20,
};

export const MOOD_TAGS = [
  "quiet", "melancholic", "slow", "winter", "political", "tender", "dark", "hopeful", "isolating", "funny",
  "romantic", "nostalgic", "rural", "satirical", "epic", "family", "mind-bending", "suspenseful", "philosophical", "mysterious",
];

// Ask Phi moods mapped onto stored mood_tags.
export const ASK_MOODS: Record<string, string[]> = {
  "thought-provoking": ["philosophical", "mind-bending"],
  comforting: ["tender", "hopeful", "funny"],
  melancholic: ["melancholic"],
  mysterious: ["mysterious"],
  philosophical: ["philosophical"],
  suspenseful: ["suspenseful"],
  hopeful: ["hopeful"],
  "emotionally intense": ["dark", "romantic"],
  escapist: ["epic", "funny", "mind-bending"],
  curious: ["mysterious", "mind-bending"],
};
