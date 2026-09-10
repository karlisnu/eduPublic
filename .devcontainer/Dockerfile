FROM mcr.microsoft.com/devcontainers/dotnet:1-8.0-bookworm

RUN rm -f /etc/apt/sources.list.d/yarn.list \
     && sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources \
     && apt-get update \
     && apt-get install -y --no-install-recommends default-mysql-client \
     && apt-get clean \
     && rm -rf /var/lib/apt/lists/*

RUN su vscode -c "source /usr/local/share/nvm/nvm.sh && nvm install --lts && nvm use --lts" 2>&1
