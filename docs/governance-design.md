# Governance Design (Phase 1 Decisions)

Design choices to guide contract hardening (Phase 2) and frontend work. Assumptions are explicit so we can adjust before implementation.

## Goals
- Token-based voting with predictable quorum/threshold and clear timelock.
- Minimal action surface for MVP (treasury transfers), but extensible via adapters.
- Safe execution (hash checks) and clear lifecycle events for the frontend.

## Voting Power & Snapshots
- **Source:** SIP-010 governance token (`governance-token` to be added); 1 token = 1 vote. Rationale: aligns with Stacks tooling, easy to audit balances.
- **Snapshot timing:** Capture total supply and per-voter balances at proposal creation (`start-height`). Voting uses the recorded balance to avoid manipulation after proposal start.
- **Delegation:** Not included for MVP. Keep interface open to add a delegation map later (delegatee per voter, weight transferred) without breaking storage.
- **Proposal creation power:** Require proposer balance ≥ proposal threshold at snapshot time.

## Parameters (proposed)
- **Proposal threshold:** 1% of total supply (prevent spam while still reachable).  
- **Quorum:** 10% of total supply must participate.  
- **Voting period:** 2,100 blocks (≈ one day on 30s blocks; adjust if network block time differs).  
- **Timelock:** 100 blocks after queue before execute.  
- **Choices:** For / Against / Abstain; pass condition: quorum met and For > Against.

## Allowed Actions (MVP)
- **STX transfer:** Amount, recipient, optional memo (if needed via adapter).  
- **FT transfer (SIP-010):** Token principal, amount, recipient, optional memo.  
- No arbitrary calls in MVP; future actions go through additional adapters.

## Adapter & Treasury Shape
- **Adapter registry (future-proof):** Core stores adapter per proposal (validated against trait). For MVP we keep `transfer-adapter` as default, but allow passing adapter principal at propose time.
- **Integrity:** Store adapter contract hash and payload hash in proposal; verify both at execute.
- **Treasury:** Implements STX and FT transfers; callable only by DAO core.

## Lifecycle & Permissions
- **Cancel:** Allowed by proposer or any account meeting proposal-threshold power (using snapshot supply).  
- **Queue:** Only after voting window closes and pass condition met.  
- **Execute:** After timelock and only if adapter/payload hashes match. Adapter must return bool success or error code.
- **Events/prints:** Emit for propose, vote, queue, execute, cancel to drive frontend updates.

## Frontend Expectations
- Show derived status: Pending → Voting → Queued → Ready → Executed/Cancelled/Failed.  
- Display block countdowns for end-height and eta.  
- Validate inputs for STX/FT proposals; highlight required token address for FT actions.

## Risks & Open Points
- Token distribution plan (airdrops, team, treasury) affects quorum realism—finalize before deployment.  
- Delegation and vote-escrow are out of scope for MVP; note if needed soon.  
- Block-time assumptions (30s) should be confirmed; adjust periods if using different cadence.
