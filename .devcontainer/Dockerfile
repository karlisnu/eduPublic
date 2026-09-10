FROM mcr.microsoft.com/devcontainers/dotnet:1-8.0-bookworm

RUN apt-get update \
     && apt-get install -y --no-install-recommends postgresql-client \
     && apt-get clean \
     && rm -rf /var/lib/apt/lists/*

RUN su vscode -c "source /usr/local/share/nvm/nvm.sh && nvm install --lts && nvm use --lts && npm install -g typescript" 2>&1
