FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y \
  libreoffice \
  fonts-dejavu \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .
RUN chown -R node:node /app
USER node
EXPOSE 8787
CMD ["node", "index.js"]
