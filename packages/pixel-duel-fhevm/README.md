# Pixel Duel FHEVM — State Channel + Checkpoint (K=3) — Sepolia

This repo is a runnable **skeleton** for a privacy-preserving, turn-based duel (3 elements × 3 skills)
built on **Zama FHEVM**. It uses a **state-channel-like flow** with **optional checkpoint every 3 rounds**,
so players don't send a transaction each round.

**Packages:**
- `contracts/` — Hardhat project (Sepolia). Contains `TrioDuel.sol`.
- `server/` — Aggregator/Coordinator (Express). Collects encrypted skill inputs; when it has 3 rounds from both players, it calls `applyRounds` on-chain as a **checkpoint**.
- `frontend/` — Next.js + Tailwind pixel UI. Calls the server API to submit skills; you can wire it to show your own HP after each checkpoint (via Relayer ACL).

> Note: This is a **skeleton**: depending on your installed FHEVM version, you might need to adjust
import paths and a few API names (e.g. `externalEuint8`, `FHE.fromExternal`, `FHE.requestDecryption`).
All TODOs are marked in code comments.

---

## Quick Start

### 1) Contracts (Hardhat)

```bash
cd contracts
pnpm i
# Fill .env with your Sepolia RPC + deployer private key
cp .env.example .env
pnpm hardhat run scripts/deploy.ts --network sepolia
# Copy the DUEL_ADDR from the output
```

**.env**
```
SEPOLIA_RPC_URL=
PRIVATE_KEY=
```

### 2) Server (Aggregator)

```bash
cd server
pnpm i
cp .env.example .env
# Set RPC (Sepolia), PRIVATE_KEY (server caller), RELAYER_API_KEY, DUEL_ADDR (from deploy)
pnpm tsx src/index.ts
```

### 3) Frontend (Pixel UI)

```bash
cd frontend
pnpm i
cp .env.local.example .env.local
# Set NEXT_PUBLIC_AGG to aggregator URL
pnpm dev
# open http://localhost:3000/pixel-duel
```

---

## Flow (K=3 checkpoint)
- Each round, each player **encrypts** a skill (0,1,2) client-side with Relayer SDK and POSTs it to `/api/skill`.
- The server stores **handles** per player. Once there are **3** for both sides, it calls `contracts.applyRounds()`
  with `externalEuint8[]` + input proofs — that is **one on-chain checkpoint for 3 rounds**.
- Later you can call `requestWinnerDecryption()` (contract) to reveal winner via the FHE Decryption Oracle;
  or call `finalizeQuick()` passing a plaintext winner if you've confirmed off-chain.

---

## Monorepo?
This is *not* a monorepo; each folder is independent for clarity. You can convert it to workspaces later.

Good luck & have fun!
