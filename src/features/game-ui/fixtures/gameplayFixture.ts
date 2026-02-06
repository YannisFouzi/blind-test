import type { RoomPlayer, Song, Work } from "@/types";

export type GameplayFixtureMode = "solo" | "multi";
export type GameplayFixtureVariant = "single" | "double";
export type GameplayFixtureState = "initial" | "selected" | "revealed";

type SearchParamsLike = {
  get: (key: string) => string | null;
};

export type GameplayFixtureConfig = {
  mode: GameplayFixtureMode;
  variant: GameplayFixtureVariant;
  state: GameplayFixtureState;
  cards: number;
};

export type GameplayFixtureModel = {
  config: GameplayFixtureConfig;
  works: Work[];
  currentSong: Song;
  roundSongs: Song[];
  selectedWork: string | null;
  selectedWorkSlot1: string | null;
  selectedWorkSlot2: string | null;
  showAnswer: boolean;
  isCurrentSongAnswered: boolean;
  canValidate: boolean;
  footerActionLabel: string | null;
  players: RoomPlayer[];
  currentPlayerId: string;
  score: {
    correct: number;
    incorrect: number;
  };
};

const BASE_DATE = new Date("2026-01-01T00:00:00.000Z");
const FALLBACK_CARD_COUNT = 5;
const MIN_CARD_COUNT = 2;
const MAX_CARD_COUNT = 8;

const WORK_TITLES = [
  "L'ecole des sorciers",
  "La Chambre des secrets",
  "Le Prisonnier d'Azkaban",
  "L'Ordre du phenix",
  "La Coupe de feu",
  "Le Prince de sang-mele",
  "Les reliques de la mort - 1ere partie",
  "Les reliques de la mort - 2eme partie",
] as const;

const ARTISTS = [
  "John Williams",
  "Nicholas Hooper",
  "Alexandre Desplat",
  "Gustavo Santaolalla",
  "Michael Giacchino",
  "Randy Newman",
  "Lebo M",
  "Tina Turner",
] as const;

const SONG_TITLES = [
  "Main Theme",
  "Masks On",
  "At The Burrow",
  "Collateral",
  "Glory Days",
  "School",
  "He Lives In You",
  "The Glory Days",
] as const;

const clampCardCount = (value: number) =>
  Math.max(MIN_CARD_COUNT, Math.min(MAX_CARD_COUNT, value));

const parseMode = (value: string | null): GameplayFixtureMode =>
  value === "multi" ? "multi" : "solo";

const parseVariant = (value: string | null): GameplayFixtureVariant =>
  value === "double" ? "double" : "single";

const parseState = (value: string | null): GameplayFixtureState => {
  if (value === "initial" || value === "selected" || value === "revealed") {
    return value;
  }
  return "revealed";
};

export const parseGameplayFixtureConfig = (
  searchParams: SearchParamsLike
): GameplayFixtureConfig => {
  const rawCards = Number.parseInt(searchParams.get("cards") ?? "", 10);
  const parsedCards = Number.isNaN(rawCards) ? FALLBACK_CARD_COUNT : rawCards;

  return {
    mode: parseMode(searchParams.get("mode")),
    variant: parseVariant(searchParams.get("variant")),
    state: parseState(searchParams.get("state")),
    cards: clampCardCount(parsedCards),
  };
};

const createWorks = (count: number): Work[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `work-${index + 1}`,
    title: WORK_TITLES[index] ?? `Oeuvre ${index + 1}`,
    universeId: "fixture-universe",
    playlistId: undefined,
    playlistUrl: undefined,
    order: index,
    createdAt: BASE_DATE,
  }));

const createSong = (work: Work, index: number): Song => ({
  id: `song-${index + 1}`,
  title: SONG_TITLES[index] ?? `Track ${index + 1}`,
  artist: ARTISTS[index] ?? `Artist ${index + 1}`,
  workId: work.id,
  youtubeId: `fixture-youtube-${index + 1}`,
  audioUrl: `https://example.com/audio-${index + 1}.mp3`,
  audioUrlReversed: `https://example.com/audio-${index + 1}-reverse.mp3`,
  duration: 245,
  createdAt: BASE_DATE,
});

const buildPlayers = (): RoomPlayer[] => [
  {
    id: "player-self",
    displayName: "you",
    score: 12,
    correct: 12,
    incorrect: 3,
    connected: true,
    isHost: true,
    hasAnsweredCurrentSong: true,
  },
  {
    id: "player-2",
    displayName: "alpha",
    score: 10,
    correct: 10,
    incorrect: 5,
    connected: true,
    isHost: false,
    hasAnsweredCurrentSong: true,
  },
  {
    id: "player-3",
    displayName: "bravo",
    score: 8,
    correct: 8,
    incorrect: 6,
    connected: true,
    isHost: false,
    hasAnsweredCurrentSong: false,
  },
  {
    id: "player-4",
    displayName: "charlie",
    score: 7,
    correct: 7,
    incorrect: 7,
    connected: true,
    isHost: false,
    hasAnsweredCurrentSong: false,
  },
];

export const buildGameplayFixtureModel = (
  config: GameplayFixtureConfig
): GameplayFixtureModel => {
  const works = createWorks(config.cards);
  const songs = works.map((work, index) => createSong(work, index));

  const currentSong = songs[0];
  const secondarySong = songs[1] ?? songs[0];
  const roundSongs: Song[] = [currentSong, secondarySong];

  const firstWorkId = works[0]?.id ?? "work-1";
  const secondWorkId = works[1]?.id ?? firstWorkId;
  const thirdWorkId = works[2]?.id ?? secondWorkId;

  const isRevealed = config.state === "revealed";
  const isSelected = config.state === "selected";

  let selectedWork: string | null = null;
  let selectedWorkSlot1: string | null = null;
  let selectedWorkSlot2: string | null = null;

  if (config.variant === "single") {
    selectedWork = config.state === "initial" ? null : secondWorkId;
  } else if (config.state === "selected") {
    selectedWorkSlot1 = firstWorkId;
    selectedWorkSlot2 = secondWorkId;
  } else if (config.state === "revealed") {
    selectedWorkSlot1 = firstWorkId;
    selectedWorkSlot2 = config.cards >= 3 ? thirdWorkId : secondWorkId;
  }

  return {
    config,
    works,
    currentSong,
    roundSongs,
    selectedWork,
    selectedWorkSlot1,
    selectedWorkSlot2,
    showAnswer: isRevealed,
    isCurrentSongAnswered: isRevealed,
    canValidate: isSelected,
    footerActionLabel: isRevealed ? "Manche suivante" : null,
    players: buildPlayers(),
    currentPlayerId: "player-self",
    score: {
      correct: 12,
      incorrect: 3,
    },
  };
};
