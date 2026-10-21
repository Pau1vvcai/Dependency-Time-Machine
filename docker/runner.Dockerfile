FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates git \
  && npm install --global pnpm@12.8.1 \
  && useradd --create-home --uid 10001 runner \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
USER runner

CMD ["node", "--version"]
