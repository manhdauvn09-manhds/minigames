/**
 * Game configuration extracted from game-spec.json.
 * Edit game-spec.json and re-run scaffold to update.
 */

export const gameConfig = {
  name: "Penumbra",
  nameKebab: "penumbra",
  tagline: "Trace the line. Find the light.",
  scopeTier: "mvp-plus-ai" as const,

  i18n: {
    defaultLocale: "vi",
    supportedLocales: ["vi", "en", "ja"] as const,
    fallbackChain: { ja: "en", vi: "en", en: "en" },
  },

  hint: {
    initialBalance: 3,
    dailyRefillTo: 3,
    maxBalance: 20,
    perUserDailyAICap: 5,
    tiers: [
      { tier: 1, name: "highlight", cost: 0, starsCap: 3 },
      { tier: 2, name: "next-move", cost: 1, starsCap: 1 },
      { tier: 3, name: "ai-explain", cost: 2, starsCap: 1 },
    ] as const,
  },

  daily: {
    rolloverTime: "00:00 UTC",
    sameForAllUsers: true,
    archiveAfterDays: 90,
  },

  monetization: {
    model: "indie-commercial" as const,
    adsEnabled: true,
    interstitialEveryNLevels: 5,
    disabledOnFirstNLevels: 10,
  },

  features: {
    scoringStars: true,
    hintSystem: true,
    saveProgress: true,
    dailyPuzzle: true,
    shareEmojiGrid: true,
    shareableUrl: true,
    noSignupQuickPlay: true,
    darkMode: true,
    dailyStreak: true,
    freezeTokens: true,
    achievements: true,
    achievementsAtLaunchCount: 12,
    seasonalEvents: false,
    emailDigest: true,
    hintEconomy: true,
    friendLeaderboard: false,
    asyncPvP: false,
    realtimeCoop: false,
    ugcCreator: false,
    embedWidget: false,
    phantomPath: true,
    adaptiveDifficulty: true,
    aiHintExplainer: true,
    moodBasedGeneration: false,
    soulutionEleganceScoring: false,
    aiCoCreate: false,
    donationLink: true,
    displayAds: true,
    rewardedVideoForHints: true,
    proSubscription: false,
    cosmeticPacks: false,
    wcagAA: true,
    multiLanguage: true,
    darkModeSupport: true,
    reducedMotion: true,
    colorblindMode: true,
    keyboardFirst: true,
  },
} as const;

export type GameConfig = typeof gameConfig;
