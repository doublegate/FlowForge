FROM node:18-alpine

WORKDIR /app

# Install actionlint for workflow validation
RUN apk add --no-cache curl && \
    curl -L https://github.com/rhysd/actionlint/releases/latest/download/actionlint_linux_amd64.tar.gz | \
    tar xz -C /usr/local/bin && \
    chmod +x /usr/local/bin/actionlint

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "index.js"]