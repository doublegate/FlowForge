FROM node:18-alpine

WORKDIR /app

# Install actionlint for workflow validation
# Using a specific version for reliability and proper Alpine compatibility
RUN apk add --no-cache curl && \
    curl -fsSL https://github.com/rhysd/actionlint/releases/download/v1.6.26/actionlint_1.6.26_linux_amd64.tar.gz | \
    tar xz -C /usr/local/bin actionlint && \
    chmod +x /usr/local/bin/actionlint

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "index.js"]