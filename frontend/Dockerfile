# TrustChain frontend — multi-stage: build with Node, serve with nginx.
# Build args allow environment-specific API/chain configuration at image build.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_CHAIN_ID=137
ARG VITE_VERIFY_BASE_URL=https://verify.trustchain.io
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_CHAIN_ID=$VITE_CHAIN_ID \
    VITE_VERIFY_BASE_URL=$VITE_VERIFY_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ >/dev/null || exit 1
