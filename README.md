# Stacks DAO

Stacks DAO is a lightweight governance app for proposing and voting on treasury transfers directly on the Stacks blockchain. It ships with a modern Next.js UI, Stacks Connect/Reown wallet support, and a simple on-chain contract that tracks proposals and vote totals on testnet.

## Tech stack
- Contracts: Clarity (`contracts/`)
- Frontend: Next.js (App Router), React 19, Tailwind CSS v4 (`frontend/`)
- Wallets: Stacks Connect + Reown AppKit (optional)
- Network SDKs: `@stacks/network`, `@stacks/transactions`, `@stacks/connect`
- Data: Hiro API (testnet/mainnet)

## How it works
- `dao-core-v1` stores proposals and votes on-chain.
- `propose` writes a proposal (recipient + amount) if the proposer has >= 1 STX.
- `cast-vote` records a vote (for/against) weighted by current STX balance.
- The UI reads proposals from the contract map via Hiro API and shows live status.
- Voting/creation call the contract using Stacks Connect.

## Repo layout
- `contracts/` Clarity smart contracts
- `deployments/` deployment plans
- `tests/` Clarinet/Vitest tests
- `frontend/` Next.js app

## Setup
1) Install dependencies
```bash
npm install
cd frontend && npm install
```

2) Create `frontend/.env.local`
```bash
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DAO_CONTRACT="ST1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXVPSAX13.dao-core-v1"
# Optional: enable Reown AppKit wallet modal
NEXT_PUBLIC_REOWN_PROJECT_ID="your-project-id"
```

3) Run the app
```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## Using the app
- Use the header “Connect wallet” button to choose:
  - Reown AppKit (if `NEXT_PUBLIC_REOWN_PROJECT_ID` is set)
  - Stacks Connect
- Create proposals from `/create-proposal`.
- Vote from `/vote` or the homepage proposal list.

## Testnet contract
- DAO contract: `ST1G4ZDXED8XM2XJ4Q4GJ7F4PG4EJQ1KKXVPSAX13.dao-core-v1`

## Notes
- Proposal ids are sequential (`next-proposal-id`).
- Voting is open for 1,440 blocks from proposal creation.
- A proposal must exist before it can be voted on; otherwise `(err u100)` is returned.
