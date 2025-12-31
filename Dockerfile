# Dockerfile para rodar o simulador no Render

# ---- Build stage ----
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Mantém apenas dependências de runtime
RUN npm prune --omit=dev

# ---- Runtime stage ----
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Render injeta PORT em runtime; default permanece 3000
ENV PORT=3000

# Mantém sqlite fora de src/ (ver DatabaseConfig.ts)
ENV NODE_ENV=production
ENV DATABASE_TYPE=sql

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

RUN mkdir -p simulation_output

EXPOSE 3000

CMD ["node", "dist/index.js"]
