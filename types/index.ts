// Types pour l'application Blind Test

export interface Universe {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  active?: boolean;
  createdAt: Date;
}

export interface Work {
  id: string;
  title: string;
  universeId: string;
  playlistId: string; // YouTube playlist ID
  createdAt: Date;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  workId: string;
  youtubeId: string; // YouTube video ID
  duration: number; // en secondes
  createdAt: Date;
}

export interface GameSession {
  id: string;
  universeId: string;
  songs: Song[];
  currentSongIndex: number;
  score: {
    correct: number;
    incorrect: number;
  };
  answers: GameAnswer[];
  createdAt: Date;
}

export interface GameAnswer {
  songId: string;
  workId: string;
  selectedWorkId: string | null;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isAdmin: boolean;
}
