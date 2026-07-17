# Harbor

## Setup

```bash
cp .env.example .env
bun install
docker compose up -d
bunx prisma migrate dev
bunx prisma generate
bun dev
```

App runs at http://localhost:3000
