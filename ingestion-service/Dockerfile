FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    bash \
    python3 \
    python3-pip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Installer yt-dlp version fixe (2024.11.18 = stable avec cookies + web client)
RUN python3 -m pip install --no-cache-dir --break-system-packages yt-dlp==2024.11.18

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts

# Skip dependency postinstall scripts (youtube-dl-exec tries to download from GitHub)
RUN npm ci --ignore-scripts

COPY . .

RUN npm run build

RUN npm prune --production

RUN mkdir -p /app/temp && chmod 777 /app/temp
RUN mkdir -p /app/cookies && chmod 700 /app/cookies

EXPOSE 4000

CMD ["node", "dist/index.js"]
