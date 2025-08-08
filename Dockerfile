FROM node:18-slim

RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && \
    rm -rf /var/lib/apt/lists/*

ARG PAT_TOKEN
ENV PAT_TOKEN=${PAT_TOKEN}

COPY . /task-tracker/

WORKDIR /task-tracker/

RUN npm install && \
    cd client && npm install && \
    cd ../server && npm install && \
    cd ..

RUN npm run build

EXPOSE 8080

CMD ["npm", "start"]