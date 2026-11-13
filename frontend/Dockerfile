# syntax=docker/dockerfile:1

# ---- Build estático do React ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# "/api" = mesma origem (o Caddy abaixo encaminha /api para o backend), sem CORS.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Caddy: serve o SPA, faz HTTPS automático e proxy da API ----
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80 443 443/udp
