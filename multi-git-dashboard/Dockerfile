FROM node:alpine

WORKDIR /app

# Specify Timezone
ENV TZ=Asia/Singapore
RUN apk add --no-cache tzdata && \
    ln -sf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

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