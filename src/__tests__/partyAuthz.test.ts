import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import BlindTestRoom from "../../party/index";

type SentMessage = { type?: string; message?: string };

type MockConnection = {
  id: string;
  send: (payload: string) => void;
  sent: SentMessage[];
};

type MockRoom = {
  id: string;
  env: { PARTYKIT_HOST: string };
  getConnections: () => MockConnection[];
};

type RoomCtorArg = ConstructorParameters<typeof BlindTestRoom>[0];

type PrivateRoomAccess = {
  state: BlindTestRoom["state"];
  handleStart: (msg: { type: "start"; hostId: string }, sender: MockConnection) => void;
  handleNext: (msg: { type: "next"; hostId: string }, sender: MockConnection) => void;
  handleShowScores: (
    msg: { type: "show_scores"; hostId: string },
    sender: MockConnection
  ) => void;
  handleAnswer: (
    msg: { type: "answer"; playerId: string; songId?: string; workId?: string | null },
    sender: MockConnection
  ) => void;
};

const createConnection = (id: string): MockConnection => {
  const sent: SentMessage[] = [];
  return {
    id,
    send: (payload: string) => {
      sent.push(JSON.parse(payload) as SentMessage);
    },
    sent,
  };
};

const createRoom = (connections: MockConnection[]): MockRoom => ({
  id: "room-test",
  env: { PARTYKIT_HOST: "http://localhost:1999" },
  getConnections: () => connections,
});

const createPlayer = (id: string, connectionId: string, isHost = false) => ({
  id,
  displayName: id,
  score: 0,
  correct: 0,
  incorrect: 0,
  isHost,
  connected: true,
  connectionId,
});

const getLastError = (conn: MockConnection) =>
  conn.sent.filter((message) => message.type === "error").at(-1);

describe("Party authz hardening", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects start spoofing when sender is not the host connection", () => {
    const hostConn = createConnection("conn-host");
    const attackerConn = createConnection("conn-attacker");
    const room = new BlindTestRoom(createRoom([hostConn, attackerConn]) as unknown as RoomCtorArg);
    const privateRoom = room as unknown as PrivateRoomAccess;
    const state = privateRoom.state;

    state.hostId = "host";
    state.players.set("host", createPlayer("host", hostConn.id, true));
    state.players.set("attacker", createPlayer("attacker", attackerConn.id, false));

    privateRoom.handleStart({ type: "start", hostId: "host" }, attackerConn);

    expect(getLastError(attackerConn)?.message).toBe("Only the host can start the game");
    expect(state.state).toBe("idle");
  });

  it("rejects next-song spoofing when sender is not host", () => {
    const hostConn = createConnection("conn-host");
    const attackerConn = createConnection("conn-attacker");
    const room = new BlindTestRoom(createRoom([hostConn, attackerConn]) as unknown as RoomCtorArg);
    const privateRoom = room as unknown as PrivateRoomAccess;
    const state = privateRoom.state;

    state.hostId = "host";
    state.state = "playing";
    state.players.set("host", createPlayer("host", hostConn.id, true));
    state.players.set("attacker", createPlayer("attacker", attackerConn.id, false));

    privateRoom.handleNext({ type: "next", hostId: "host" }, attackerConn);

    expect(getLastError(attackerConn)?.message).toBe("Only the host can go to next song");
  });

  it("rejects show-scores spoofing when sender is not host", () => {
    const hostConn = createConnection("conn-host");
    const attackerConn = createConnection("conn-attacker");
    const room = new BlindTestRoom(createRoom([hostConn, attackerConn]) as unknown as RoomCtorArg);
    const privateRoom = room as unknown as PrivateRoomAccess;
    const state = privateRoom.state;

    state.hostId = "host";
    state.state = "results";
    state.players.set("host", createPlayer("host", hostConn.id, true));
    state.players.set("attacker", createPlayer("attacker", attackerConn.id, false));

    privateRoom.handleShowScores({ type: "show_scores", hostId: "host" }, attackerConn);

    expect(getLastError(attackerConn)?.message).toBe("Only the host can show scores");
  });

  it("rejects answer impersonation when claimed playerId does not match sender", () => {
    const attackerConn = createConnection("conn-attacker");
    const victimConn = createConnection("conn-victim");
    const room = new BlindTestRoom(createRoom([attackerConn, victimConn]) as unknown as RoomCtorArg);
    const privateRoom = room as unknown as PrivateRoomAccess;
    const state = privateRoom.state;

    state.state = "playing";
    state.players.set("attacker", createPlayer("attacker", attackerConn.id, false));
    state.players.set("victim", createPlayer("victim", victimConn.id, false));
    state.songs = [
      {
        id: "song-1",
        title: "Song 1",
        artist: "Artist",
        workId: "work-1",
        youtubeId: "yt-1",
        duration: 30,
      },
    ];

    privateRoom.handleAnswer(
      {
        type: "answer",
        playerId: "victim",
        songId: "song-1",
        workId: "work-1",
      },
      attackerConn
    );

    expect(getLastError(attackerConn)?.message).toBe("Player ID mismatch");
    expect(state.responses.size).toBe(0);
  });

  it("rejects host action when sender is not bound to a player", () => {
    const unknownConn = createConnection("conn-unknown");
    const room = new BlindTestRoom(createRoom([unknownConn]) as unknown as RoomCtorArg);
    const privateRoom = room as unknown as PrivateRoomAccess;
    const state = privateRoom.state;

    state.hostId = "host";
    state.players.set("host", createPlayer("host", "conn-host", true));

    privateRoom.handleStart({ type: "start", hostId: "host" }, unknownConn);

    expect(getLastError(unknownConn)?.message).toBe("Player not found for this connection");
  });
});
