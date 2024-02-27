FROM node:alpine

WORKDIR /app

RUN npm install --global pnpm pm2

COPY ./multi-git-dashboard/package*.json ./multi-git-dashboard/

WORKDIR /app/multi-git-dashboard

RUN pnpm install

WORKDIR /app

# Copy frontend and shared folder
COPY ./multi-git-dashboard/ ./multi-git-dashboard/
COPY ./shared/ ./shared/

WORKDIR /app/multi-git-dashboard

RUN pnpm run build

EXPOSE 3000

CMD [ "pm2-runtime", "pnpm", "--", "start" ]