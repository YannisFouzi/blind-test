import { assign, setup } from "xstate";
import type { GameRound, Room, RoomPlayer, RoomResponse, Song } from "@/types";

type RoomOptions = { noSeek?: boolean };

export type ServerStateSnapshot = {
  roomId?: string;
  hostId?: string;
  universeId?: string;
  songs?: Song[];
  currentSongIndex?: number;
  currentRoundIndex?: number;
  currentRound?: GameRound;
  roundCount?: number;
  displayedSongIndex?: number;
  displayedTotalSongs?: number;
  state?: Room["state"];
  allowedWorks?: string[];
  worksPerRound?: number;
  options?: RoomOptions;
  players?: RoomPlayer[];
};

export type RoomMachineContext = {
  room: Partial<Room>;
  players: RoomPlayer[];
  responses: RoomResponse[];
  allPlayersAnswered: boolean;
  isConnected: boolean;
  error: string | null;
  startAt?: number;
};

export type RoomMachineEvent =
  | { type: "socket_open" }
  | { type: "socket_close" }
  | { type: "socket_error"; error: string }
  | { type: "state_sync"; state: ServerStateSnapshot }
  | {
      type: "join_success";
      playerId: string;
      isHost?: boolean;
      state?: Room["state"];
      hostId?: string;
      sessionToken?: string;
    }
  | { type: "players_update"; players: RoomPlayer[] }
  | {
      type: "room_configured";
      universeId?: string;
      songs?: Song[];
      allowedWorks?: string[];
      worksPerRound?: number;
      options?: RoomOptions;
    }
  | {
      type: "game_starting";
      state: "starting";
      songs?: Song[];
      totalSongs?: number;
      currentSongIndex?: number;
      currentRoundIndex?: number;
      currentRound?: GameRound;
      roundCount?: number;
      displayedSongIndex?: number;
      displayedTotalSongs?: number;
    }
  | { type: "all_players_ready"; startIn: number }
  | {
      type: "game_started";
      currentSongIndex?: number;
      currentRoundIndex?: number;
      currentRound?: GameRound;
      roundCount?: number;
      displayedSongIndex?: number;
      displayedTotalSongs?: number;
      state?: "playing";
      songs?: Song[];
    }
  | { type: "configure_success" }
  | {
      type: "song_changed";
      currentSongIndex?: number;
      currentRoundIndex?: number;
      currentRound?: GameRound;
      roundCount?: number;
      displayedSongIndex?: number;
      displayedTotalSongs?: number;
    }
  | { type: "game_ended"; players?: RoomPlayer[]; state?: "results" }
  | { type: "answer_recorded"; response: RoomResponse }
  | { type: "player_answered"; playerId: string; songId: string }
  | { type: "all_players_answered" }
  | { type: "host_changed"; newHostId?: string; players?: RoomPlayer[] }
  | { type: "error"; message: string }
  | { type: "reset_responses" };

const INITIAL_ROOM: Partial<Room> = {
  state: "idle",
  currentSongIndex: 0,
  songs: [],
  hostId: "",
  universeId: "",
};

const normalizeOptions = (options?: RoomOptions) => {
  if (!options) return undefined;
  return { noSeek: Boolean(options.noSeek) };
};

const areAllPlayersAnswered = (players: RoomPlayer[]) => {
  const connectedPlayers = players.filter((player) => player.connected !== false);
  if (connectedPlayers.length === 0) return false;
  return connectedPlayers.every((player) => Boolean(player.hasAnsweredCurrentSong));
};

const addResponse = (responses: RoomResponse[], response: RoomResponse) => {
  const exists = responses.some(
    (existing) =>
      existing.songId === response.songId && existing.playerId === response.playerId
  );
  if (exists) return responses;
  return [...responses, response];
};

export const roomMachine = setup({
  types: {} as {
    context: RoomMachineContext;
    events: RoomMachineEvent;
  },
  guards: {
    serverStateIsPlaying: ({ event }) =>
      event.type === "state_sync" && event.state.state === "playing",
    serverStateIsResults: ({ event }) =>
      event.type === "state_sync" && event.state.state === "results",
    joinStateIsPlaying: ({ event }) =>
      event.type === "join_success" && event.state === "playing",
    joinStateIsResults: ({ event }) =>
      event.type === "join_success" && event.state === "results",
  },
  actions: {
    setConnected: assign({
      isConnected: () => true,
      error: () => null,
    }),
    setDisconnected: assign({
      isConnected: () => false,
    }),
    setSocketError: assign({
      error: ({ event }) => (event.type === "socket_error" ? event.error : null),
    }),
    setServerError: assign({
      error: ({ event }) => (event.type === "error" ? event.message : null),
    }),
    clearError: assign({
      error: () => null,
    }),
    applyStateSync: assign(({ context, event }) => {
      if (event.type !== "state_sync") return {};
      const snapshot = event.state;
      const nextPlayers = snapshot.players ?? context.players;
      const nextState = snapshot.state ?? context.room.state ?? "idle";

      return {
        room: {
          ...context.room,
          id: snapshot.roomId ?? context.room.id,
          hostId: snapshot.hostId ?? context.room.hostId,
          universeId: snapshot.universeId ?? context.room.universeId,
          songs: snapshot.songs ?? context.room.songs ?? [],
          currentSongIndex:
            snapshot.currentSongIndex ?? context.room.currentSongIndex ?? 0,
          currentRoundIndex: snapshot.currentRoundIndex ?? context.room.currentRoundIndex,
          currentRound: snapshot.currentRound ?? context.room.currentRound,
          roundCount: snapshot.roundCount ?? context.room.roundCount,
          displayedSongIndex: snapshot.displayedSongIndex ?? context.room.displayedSongIndex,
          displayedTotalSongs:
            snapshot.displayedTotalSongs ?? context.room.displayedTotalSongs,
          state: nextState,
          allowedWorks: snapshot.allowedWorks ?? context.room.allowedWorks,
          worksPerRound: snapshot.worksPerRound ?? context.room.worksPerRound,
          options: snapshot.options ? normalizeOptions(snapshot.options) : context.room.options,
        },
        players: nextPlayers,
        allPlayersAnswered: snapshot.players
          ? areAllPlayersAnswered(nextPlayers)
          : context.allPlayersAnswered,
        error: null,
      };
    }),
    applyJoinSuccess: assign(({ context, event }) => {
      if (event.type !== "join_success") return {};
      return {
        room: {
          ...context.room,
          hostId: event.hostId ?? context.room.hostId,
          state: event.state ?? context.room.state,
        },
        error: null,
      };
    }),
    applyPlayersUpdate: assign(({ event }) => {
      if (event.type !== "players_update") return {};
      return {
        players: event.players,
        allPlayersAnswered: areAllPlayersAnswered(event.players),
      };
    }),
    applyRoomConfigured: assign(({ context, event }) => {
      if (event.type !== "room_configured") return {};
      return {
        room: {
          ...context.room,
          universeId: event.universeId ?? context.room.universeId,
          songs: event.songs ?? context.room.songs ?? [],
          allowedWorks: event.allowedWorks ?? context.room.allowedWorks,
          worksPerRound: event.worksPerRound ?? context.room.worksPerRound,
          options: event.options ? normalizeOptions(event.options) : context.room.options,
          currentSongIndex: 0,
          state: "configured" as Room["state"],
        },
        allPlayersAnswered: false,
        error: null,
      };
    }),
    applyGameStarting: assign(({ context, event }) => {
      if (event.type !== "game_starting") return {};
      return {
        room: {
          ...context.room,
          state: "starting" as Room["state"],
          songs: event.songs ?? context.room.songs ?? [],
          currentSongIndex: event.currentSongIndex ?? 0,
          currentRoundIndex: event.currentRoundIndex,
          currentRound: event.currentRound,
          roundCount: event.roundCount,
          displayedSongIndex: event.displayedSongIndex,
          displayedTotalSongs: event.displayedTotalSongs,
        },
        startAt: undefined,
        error: null,
      };
    }),
    applyAllPlayersReady: assign(({ event }) => {
      if (event.type !== "all_players_ready") return {};
      return {
        startAt: Date.now() + event.startIn,
      };
    }),
    applyGameStarted: assign(({ context, event }) => {
      if (event.type !== "game_started") return {};
      return {
        room: {
          ...context.room,
          state: "playing" as Room["state"],
          currentSongIndex: event.currentSongIndex ?? 0,
          currentRoundIndex: event.currentRoundIndex,
          currentRound: event.currentRound,
          roundCount: event.roundCount,
          displayedSongIndex: event.displayedSongIndex,
          displayedTotalSongs: event.displayedTotalSongs,
          songs: event.songs ?? context.room.songs ?? [],
        },
        startAt: undefined,
        allPlayersAnswered: false,
        error: null,
      };
    }),
    applySongChanged: assign(({ context, event }) => {
      if (event.type !== "song_changed") return {};
      return {
        room: {
          ...context.room,
          currentSongIndex:
            event.currentSongIndex ?? context.room.currentSongIndex ?? 0,
          currentRoundIndex: event.currentRoundIndex ?? context.room.currentRoundIndex,
          currentRound: event.currentRound ?? context.room.currentRound,
          roundCount: event.roundCount ?? context.room.roundCount,
          displayedSongIndex: event.displayedSongIndex ?? context.room.displayedSongIndex,
          displayedTotalSongs:
            event.displayedTotalSongs ?? context.room.displayedTotalSongs,
        },
        allPlayersAnswered: false,
      };
    }),
    applyGameEnded: assign(({ context, event }) => {
      if (event.type !== "game_ended") return {};
      return {
        room: {
          ...context.room,
          state: "results" as Room["state"],
        },
        players: event.players ?? context.players,
      };
    }),
    applyAnswerRecorded: assign(({ context, event }) => {
      if (event.type !== "answer_recorded") return {};
      return {
        responses: addResponse(context.responses, event.response),
      };
    }),
    markAllPlayersAnswered: assign({
      allPlayersAnswered: () => true,
    }),
    applyHostChanged: assign(({ context, event }) => {
      if (event.type !== "host_changed") return {};
      return {
        room: {
          ...context.room,
          hostId: event.newHostId ?? context.room.hostId,
        },
        players: event.players ?? context.players,
      };
    }),
    resetResponses: assign({
      responses: () => [],
    }),
  },
}).createMachine({
  id: "room",
  initial: "connecting",
  context: {
    room: INITIAL_ROOM,
    players: [],
    responses: [],
    allPlayersAnswered: false,
    isConnected: false,
    error: null,
    startAt: undefined,
  },
  states: {
    connecting: {},
    lobby: {},
    playing: {},
    results: {},
    error: {},
  },
  on: {
    socket_open: {
      actions: ["setConnected", "clearError"],
    },
    socket_close: {
      target: ".connecting",
      actions: "setDisconnected",
    },
    socket_error: {
      target: ".error",
      actions: "setSocketError",
    },
    error: {
      actions: "setServerError",
    },
    state_sync: [
      {
        guard: "serverStateIsPlaying",
        target: ".playing",
        actions: "applyStateSync",
      },
      {
        guard: "serverStateIsResults",
        target: ".results",
        actions: "applyStateSync",
      },
      {
        target: ".lobby",
        actions: "applyStateSync",
      },
    ],
    join_success: [
      {
        guard: "joinStateIsPlaying",
        target: ".playing",
        actions: "applyJoinSuccess",
      },
      {
        guard: "joinStateIsResults",
        target: ".results",
        actions: "applyJoinSuccess",
      },
      {
        target: ".lobby",
        actions: "applyJoinSuccess",
      },
    ],
    players_update: {
      actions: "applyPlayersUpdate",
    },
    room_configured: {
      target: ".lobby",
      actions: "applyRoomConfigured",
    },
    game_starting: {
      target: ".playing",
      actions: "applyGameStarting",
    },
    all_players_ready: {
      actions: "applyAllPlayersReady",
    },
    game_started: {
      target: ".playing",
      actions: "applyGameStarted",
    },
    song_changed: {
      actions: "applySongChanged",
    },
    game_ended: {
      target: ".results",
      actions: "applyGameEnded",
    },
    answer_recorded: {
      actions: "applyAnswerRecorded",
    },
    all_players_answered: {
      actions: "markAllPlayersAnswered",
    },
    host_changed: {
      actions: "applyHostChanged",
    },
    reset_responses: {
      actions: "resetResponses",
    },
  },
});
