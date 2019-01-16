FROM node:8-alpine

WORKDIR /usr/src/app

RUN apk update && apk upgrade && apk add bash

COPY package*.json ./

RUN apk --no-cache --virtual build-dependencies add \
    python \
    make \
    g++ \
    && npm install \
    && apk del build-dependencies

COPY . .
