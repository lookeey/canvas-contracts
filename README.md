# Canvas Contracts

This repo contains solidity contracts for the Canvas experiment.

Canvas includes:

- a native coin staking system, which mints `Ink` tokens.
  - optional locking for increased gains
  - penalty for withdrawing funds too early
- a governance system, based on how much users have staked and how long they've locked for
- an `Ink` token, which can be used to place pixel on `Canvas`
- the `Canvas`, which allows for placing pixels in a virtually infinite area (limited by int range)
  **Canvas, Ink and InkMaker are upgradeable contracts**, controlled by governance.

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.ts
```
