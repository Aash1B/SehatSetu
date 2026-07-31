FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npm run build:backend
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./
USER node
EXPOSE 8000
CMD ["node", "dist/main.js"]
