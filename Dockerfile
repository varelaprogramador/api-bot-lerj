FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

RUN npm install -g cross-env

COPY . .

RUN npm run build

EXPOSE 80

CMD ["npm", "start"] 