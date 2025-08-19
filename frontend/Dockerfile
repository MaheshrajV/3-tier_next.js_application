FROM node:20-alpine

WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY next.config.js ./
COPY app ./app

ENV PORT=3000
EXPOSE 3000

RUN npm run build
CMD ["npm", "start"]
