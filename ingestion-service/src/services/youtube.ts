const ISO_DURATION = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
const API_BASE_URL = "https://www.googleapis.com/youtube/v3";
const MAX_RESULTS = 50;

interface PlaylistItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  channelTitle: string;
}

const parseDuration = (duration: string): number => {
  const match = duration.match(ISO_DURATION);
  if (!match) return 0;
  const [hours, minutes, seconds] = match.slice(1).map((value) => parseInt(value || "0", 10));
  return hours * 3600 + minutes * 60 + seconds;
};

export const fetchPlaylistVideos = async (playlistId: string): Promise<PlaylistItem[]> => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY manquant pour l'ingestion.");
  }

  const videos: PlaylistItem[] = [];
  let nextPageToken: string | undefined;

  do {
    const playlistResp = await fetch(
      `${API_BASE_URL}/playlistItems?part=snippet&maxResults=${MAX_RESULTS}&playlistId=${playlistId}${
        nextPageToken ? `&pageToken=${nextPageToken}` : ""
      }&key=${apiKey}`
    );

    if (!playlistResp.ok) {
      throw new Error(`YouTube playlistItems error: ${playlistResp.status}`);
    }

    const playlistData = await playlistResp.json();
    nextPageToken = playlistData.nextPageToken;

    const videoIds = playlistData.items
      .map((item: { snippet?: { resourceId?: { videoId?: string } } }) => item.snippet?.resourceId?.videoId)
      .filter(Boolean);

    if (!videoIds.length) {
      continue;
    }

    const videosResp = await fetch(
      `${API_BASE_URL}/videos?part=snippet,contentDetails&id=${videoIds.join(",")}&key=${apiKey}`
    );

    if (!videosResp.ok) {
      throw new Error(`YouTube videos error: ${videosResp.status}`);
    }

    const videosData = await videosResp.json();

    for (const video of videosData.items || []) {
      videos.push({
        id: video.id,
        title: video.snippet?.title || "Titre inconnu",
        description: video.snippet?.description || "",
        duration: parseDuration(video.contentDetails?.duration || "PT0S"),
        channelTitle: video.snippet?.channelTitle || "Artiste YouTube",
      });
    }
  } while (nextPageToken);

  return videos;
};
