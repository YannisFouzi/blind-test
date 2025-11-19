import { Song, Work } from "@/types";

export const defaultWorks: Work[] = [
  {
    id: "hp-ecole-sorciers",
    title: "Harry Potter à l'École des Sorciers",
    universeId: "harry-potter",
    playlistId: "PLexample1",
    order: 1,
    createdAt: new Date(),
  },
  {
    id: "hp-chambre-secrets",
    title: "Harry Potter et la Chambre des Secrets",
    universeId: "harry-potter",
    playlistId: "PLexample2",
    order: 2,
    createdAt: new Date(),
  },
  {
    id: "hp-prisonnier-azkaban",
    title: "Harry Potter et le Prisonnier d'Azkaban",
    universeId: "harry-potter",
    playlistId: "PLexample3",
    order: 3,
    createdAt: new Date(),
  },
  {
    id: "hp-coupe-feu",
    title: "Harry Potter et la Coupe de Feu",
    universeId: "harry-potter",
    playlistId: "PLexample4",
    order: 4,
    createdAt: new Date(),
  },
  {
    id: "hp-ordre-phenix",
    title: "Harry Potter et l'Ordre du Phénix",
    universeId: "harry-potter",
    playlistId: "PLexample5",
    order: 5,
    createdAt: new Date(),
  },
  {
    id: "hp-prince-sang-mele",
    title: "Harry Potter et le Prince de Sang-Mélé",
    universeId: "harry-potter",
    playlistId: "PLexample6",
    order: 6,
    createdAt: new Date(),
  },
  {
    id: "hp-reliques-mort-1",
    title: "Harry Potter et les Reliques de la Mort - Partie 1",
    universeId: "harry-potter",
    playlistId: "PLexample7",
    order: 7,
    createdAt: new Date(),
  },
  {
    id: "hp-reliques-mort-2",
    title: "Harry Potter et les Reliques de la Mort - Partie 2",
    universeId: "harry-potter",
    playlistId: "PLexample8",
    order: 8,
    createdAt: new Date(),
  },
];

export const defaultSongs: Song[] = [
  {
    id: "song1",
    title: "The Locket",
    artist: "Alexandre Desplat",
    workId: "hp-reliques-mort-1",
    youtubeId: "dQw4w9WgXcQ",
    duration: 181,
    createdAt: new Date(),
  },
  {
    id: "song2",
    title: "Mr. Longbottom Flies",
    artist: "John Williams",
    workId: "hp-ecole-sorciers",
    youtubeId: "dQw4w9WgXcQ",
    duration: 30,
    createdAt: new Date(),
  },
];

export const createDemoSongs = (works: Work[]): Song[] => {
  return works.map((work, index) => ({
    id: `demo-song-${index + 1}`,
    title: `Musique de ${work.title}`,
    artist: "Compositeur fictif",
    workId: work.id,
    youtubeId: "dQw4w9WgXcQ",
    duration: 120 + Math.floor(Math.random() * 180),
    createdAt: new Date(),
  }));
};
