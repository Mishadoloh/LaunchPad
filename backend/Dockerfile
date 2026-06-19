FROM node:22-alpine

WORKDIR /app
COPY package*.json ./
COPY backend/package.json backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

COPY . .
RUN npm run db:generate && npm run build -w @launchpad/api

WORKDIR /app/backend
EXPOSE 4200
CMD ["npm", "run", "start"]
