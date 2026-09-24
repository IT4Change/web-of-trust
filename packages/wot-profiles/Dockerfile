# Der profiles-Dienst wird GENAU SO gebaut wie in CI: mit pnpm und der Lockfile des Repos.
#
# Vorher installierte dieses Dockerfile sich seine eigene Abhaengigkeitswelt
# (`npm install ws better-sqlite3 typescript …`, ohne Lockfile). TypeScript war
# darin ungepinnt und `@types/node` gar nicht genannt — es kam transitiv herein,
# in einer Version, die niemand festlegte. Die Typumgebung des Images war damit
# reiner Zufall und driftete irgendwann von der des Repos weg. Das Ergebnis war
# ein Image-Build, der an `TS2305: node:perf_hooks has no exported member
# IntervalHistogram` scheiterte, waehrend `pnpm -r typecheck` gruen war.
#
# Mit `--frozen-lockfile` gilt im Image exakt, was in `pnpm-lock.yaml` steht.
# Ein Abhaengigkeits-Update trifft CI und Image ab jetzt gemeinsam, oder keines
# von beiden.
FROM node:22-slim AS build

# better-sqlite3 baut ein natives Addon
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME=/pnpm
ENV PATH=/pnpm:$PATH
RUN corepack enable

WORKDIR /repo

# Erst die Manifeste, dann installieren: der Install-Layer wird nur neu gebaut,
# wenn sich Abhaengigkeiten aendern, nicht bei jeder Quelltextaenderung.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/wot-core/package.json packages/wot-core/
COPY packages/wot-profiles/package.json packages/wot-profiles/
RUN pnpm install --frozen-lockfile --filter "@web_of_trust/profiles..."

COPY packages/wot-core/ packages/wot-core/
COPY packages/wot-profiles/ packages/wot-profiles/
RUN pnpm --filter @web_of_trust/core build \
 && pnpm --filter @web_of_trust/profiles build

# Selbsttragendes Produktionsverzeichnis: nur die Laufzeit-Abhaengigkeiten, und
# der `workspace:*`-Verweis auf wot-core wird dabei aufgeloest und mitkopiert.
RUN pnpm --filter @web_of_trust/profiles deploy --prod /prod

# --- Production stage ---
FROM node:22-slim

WORKDIR /app

COPY --from=build /prod/ ./

ENV PORT=8788
ENV DB_PATH=/data/profiles.db

EXPOSE 8788

VOLUME ["/data"]

CMD ["node", "dist/start.js"]
