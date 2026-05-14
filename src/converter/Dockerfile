FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y \
  libreoffice \
  fonts-dejavu \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .
EXPOSE 8787
CMD ["node", "index.js"]
