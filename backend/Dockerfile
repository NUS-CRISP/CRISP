FROM node:alpine

WORKDIR /app

RUN npm install --global pnpm pm2

COPY ./backend/package*.json ./backend/

WORKDIR /app/backend

RUN pnpm install

WORKDIR /app

# Copy backend and shared folder
COPY ./backend/ ./backend/
COPY ./shared/ ./shared/

WORKDIR /app/backend

RUN pnpm run build

EXPOSE 3001

CMD [ "pm2-runtime", "pnpm", "--", "start" ]
