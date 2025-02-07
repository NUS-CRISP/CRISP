FROM node:alpine

WORKDIR /app

RUN npm install --global pm2

COPY ./multi-git-dashboard/package*.json ./multi-git-dashboard/

WORKDIR /app/multi-git-dashboard

RUN npm install

WORKDIR /app

COPY ./multi-git-dashboard/ ./multi-git-dashboard/
COPY ./shared/ ./shared/

WORKDIR /app/multi-git-dashboard

RUN npm run build

EXPOSE 3000

CMD [ "pm2-runtime", "npm", "--", "start" ]
