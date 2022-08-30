FROM node:18-alpine AS BUILD_IMAGE

# https://medium.com/trendyol-tech/how-we-reduce-node-docker-image-size-in-3-steps-ff2762b51d5a

WORKDIR /usr/src/app
ARG GH_PACKAGES_TOKEN

COPY . .
COPY ./prod.env ./.env

# Build from source
RUN echo "//npm.pkg.github.com/:_authToken=${GH_PACKAGES_TOKEN}" > ~/.npmrc && \
    npm ci && \
    npm run build && \
    rm -rf node_modules

# Install dependencies for production
RUN npm ci --omit=dev

FROM node:18-alpine AS RUNTIME

# `curl` is used in AWS CloudFormation HealthCheck
# hadolint ignore=DL3018
RUN apk add --no-cache curl

WORKDIR /usr/src/app

COPY --from=BUILD_IMAGE /usr/src/app/ ./

EXPOSE 3000

WORKDIR /usr/src/app
CMD ["npm", "run", "start:prod"]
