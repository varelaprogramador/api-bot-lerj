FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN chmod +x /app/node_modules/.bin/cross-env /app/node_modules/.bin/tsc /app/node_modules/.bin/tsc-alias

RUN npm run build

EXPOSE 80

CMD ["npm", "start"] 