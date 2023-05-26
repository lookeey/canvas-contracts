import {
  MAX_INK_REWARD_PER_DAY,
  STAKING_SUPPLY_SOFT_CAP,
} from "../config/index";

export const calculateRewardsPerDay = (totalShares: number) => {
  let supplyParam =
    (MAX_INK_REWARD_PER_DAY * totalShares) / STAKING_SUPPLY_SOFT_CAP;
  return (
    ((supplyParam / MAX_INK_REWARD_PER_DAY - 1) ** 3 + 1) *
    MAX_INK_REWARD_PER_DAY
  );
};
