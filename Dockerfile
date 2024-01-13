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

# Install Chromium and additional dependencies
RUN apk add --no-cache \
  chromium \
  udev \
  ttf-freefont \
  chromium-chromedriver
RUN apk add wqy-zenhei --update-cache --repository http://n1.alpinelinux.org/alpine/dege/testing

# Set Puppeteer executable path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

RUN npm install --production

RUN npm install pm2 -g

EXPOSE 3000

CMD ["pm2-runtime", "/app/main.js"]
