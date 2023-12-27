FROM node:current-alpine3.19 as build-stage

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM node:current-alpine3.19 as production-stage

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/package.json /app/package.json

WORKDIR /app

RUN npm install --production

RUN npm install pm2 -g

EXPOSE 3000

CMD ["pm2-runtime", "/app/main.js"]
