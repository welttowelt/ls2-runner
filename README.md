# ls2-runner

Autonomous Loot Survivor 2 runner scaffold using Daydreams + Playwright (read-only sensor) + Cartridge `controller-cli` (transaction actuator).

Status: v0.1 scaffold.

## Architecture (revised)

- Browser (Playwright): **read-only**
  - GraphQL intercept for state signals
  - phase detection
  - screenshots for episode logs
- controller-cli: **write path**
  - executes Starknet calls under an expiring, policy-scoped session

## Safety posture

- No credentials in repo. Do not commit `.env`.
- Transaction scope is enforced by your **Controller session policy** (`policies/ls2.json`).
- Do **not** add token contracts (STRK/ETH) to the policy. Only add the LS2 game contract + required entrypoints.

## Setup

1) Install controller-cli

```bash
curl -fsSL https://raw.githubusercontent.com/cartridge-gg/controller-cli/main/install.sh | bash
controller status --json
```

2) Create policy and register session (human step, periodic)

- Edit `policies/ls2.json` and set your LS2 contract address.

```bash
controller generate-keypair --json
controller register-session policies/ls2.json --json
controller status --json
```

3) Install deps + env

```bash
npm install
cp .env.example .env
# set ANTHROPIC_API_KEY, LS2_CONTRACT_ADDRESS, ADVENTURER_ID
```

## Run

```bash
npm run dev -- <runId>
```

## Notes

- The calldata/entrypoint signatures for LS2 are still assumptions in v0.1.
  You must confirm them against actual tx traces and then lock them down.
