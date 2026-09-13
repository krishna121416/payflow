FROM node:20-slim

# Prisma's query engine needs OpenSSL, and it isn't guaranteed present on
# the slim base image.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

EXPOSE 4000

# Applies any pending migrations against the real Postgres container
# before starting the API - the equivalent of running
# `npx prisma migrate deploy` by hand before `npm start`.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
