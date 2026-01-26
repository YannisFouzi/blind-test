import { assign, setup } from "xstate";
import type { Room, RoomPlayer, RoomResponse, Song } from "@/types";

export type ServerStateSnapshot = {
  roomId?: string;
  hostId?: string;
  universeId?: string;
  songs?: Song[];
  currentSongIndex?: number;
  state?: string;
  allowedWorks?: string[];
  options?: { noSeek?: boolean };
  players?: RoomPlayer[];
};

export type RoomMachineContext = {
  room: Partial<Room>;
  players: RoomPlayer[];
  responses: RoomResponse[];
  allPlayersAnswered: boolean;
  isConnected: boolean;
  error: string | null;
};

export type RoomMachineEvent =
  | { type: "socket_open" }
  | { type: "socket_close" }
  | { type: "socket_error"; error: string }
  | { type: "state_sync"; state: ServerStateSnapshot }
  | { type: "join_success"; playerId: string; isHost?: boolean; state?: string; hostId?: string }
  | { type: "players_update"; players: RoomPlayer[] }
  | { type: "room_configured"; universeId?: string; songs?: Song[]; allowedWorks?: string[]; options?: { noSeek?: boolean } }
  | { type: "game_started"; currentSongIndex?: number; state?: "playing"; songs?: Song[] }
  | { type: "configure_success" }
  | { type: "song_changed"; currentSongIndex?: number }
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

const normalizeOptions = (options?: { noSeek?: boolean }) => {
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
      const nextState = (snapshot.state as Room["state"]) || "idle";

      return {
        room: {
          ...context.room,
          id: snapshot.roomId ?? context.room.id,
          hostId: snapshot.hostId ?? context.room.hostId,
          universeId: snapshot.universeId ?? context.room.universeId,
          songs: snapshot.songs || [],
          currentSongIndex: snapshot.currentSongIndex ?? 0,
          state: nextState,
          allowedWorks: snapshot.allowedWorks,
          options: snapshot.options ? normalizeOptions(snapshot.options) : context.room.options,
        },
        players: nextPlayers,
        allPlayersAnswered: snapshot.players ? areAllPlayersAnswered(nextPlayers) : context.allPlayersAnswered,
        error: null,
      };
    }),
    applyJoinSuccess: assign(({ context, event }) => {
      if (event.type !== "join_success") return {};
      return {
        room: {
          ...context.room,
          hostId: event.hostId ?? context.room.hostId,
          state: (event.state as Room["state"]) ?? context.room.state,
        },
        error: null,
      };
    }),
    applyPlayersUpdate: assign(({ event }) => {
      if (event.type !== "players_update") return {};
      return {
        players: event.players || [],
        allPlayersAnswered: areAllPlayersAnswered(event.players || []),
      };
    }),
    applyRoomConfigured: assign(({ context, event }) => {
      if (event.type !== "room_configured") return {};
      return {
        room: {
          ...context.room,
          universeId: event.universeId || context.room.universeId,
          songs: event.songs || context.room.songs || [],
          allowedWorks: event.allowedWorks,
          options: event.options ? normalizeOptions(event.options) : context.room.options,
          currentSongIndex: 0,
          state: "configured" as Room["state"],
        },
        allPlayersAnswered: false,
        error: null,
      };
    }),
    applyGameStarted: assign(({ context, event }) => {
      if (event.type !== "game_started") return {};
      return {
        room: {
          ...context.room,
          state: "playing" as Room["state"],
          currentSongIndex: event.currentSongIndex ?? 0,
          songs: event.songs || context.room.songs || [],
        },
        allPlayersAnswered: false,
        error: null,
      };
    }),
    applySongChanged: assign(({ context, event }) => {
      if (event.type !== "song_changed") return {};
      return {
        room: {
          ...context.room,
          currentSongIndex: event.currentSongIndex ?? context.room.currentSongIndex ?? 0,
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
