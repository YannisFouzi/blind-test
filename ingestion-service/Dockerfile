FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    bash \
    yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY scripts ./scripts

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --production

RUN mkdir -p /app/temp && chmod 777 /app/temp
RUN mkdir -p /app/cookies && chmod 700 /app/cookies

EXPOSE 4000

CMD ["node", "dist/index.js"]
