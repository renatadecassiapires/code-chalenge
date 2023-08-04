FROM node:20-bullseye

WORKDIR /app

RUN npm install -g npm
RUN rm -rf dist node_modules yarn.lock

ENTRYPOINT [ ".docker/node/entrypoint.sh" ]