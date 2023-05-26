// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface IInkMaker {
    event Staked(address indexed user, uint256 amount, uint256 lockup, uint256 totalShares, uint256 idx);
    event Withdrawn(address indexed user, uint256 indexed idx, uint256 penalty);
    event RewardPaid(address indexed user, uint256 reward);

    function calcCurrentEmissions(uint _supply) external view returns (uint);
    function calcLockupMultiplier(uint amount, uint lockupPeriod) external view returns (uint);
    function calcWithdrawalWithPenalty(uint amount, uint lockupPeriod, uint lockupTimestamp) external view returns (uint);
    function getCurrentRewardPerSecond() external view returns (uint);
    function updateShares() external;
    function stake(uint lockup) external payable;
    function withdraw(uint index) external;
}