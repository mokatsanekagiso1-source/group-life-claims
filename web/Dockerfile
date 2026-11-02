# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
# The Cypress test runner is a dev dependency; its browser binary is not needed to build the app.
ENV CYPRESS_INSTALL_BINARY=0
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.28-alpine
# Defaults suit Docker Compose; Azure Container Apps overrides them with the API app's internal address.
ENV API_UPSTREAM=http://api:8080 \
    HEALTH_UPSTREAM=http://api:8081 \
    NGINX_ENVSUBST_FILTER=_UPSTREAM$
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /workspace/dist/web/browser /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost/ > /dev/null || exit 1
