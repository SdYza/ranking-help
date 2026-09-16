FROM node:22-alpine

WORKDIR /app
COPY package.json rankings-server.mjs rankings-help.html ./

ENV NODE_ENV=production
ENV PORT=4173
EXPOSE 4173

USER node
CMD ["npm", "start"]
