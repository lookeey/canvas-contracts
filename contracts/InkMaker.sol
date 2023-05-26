// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "./Ink.sol";
import "./interfaces/IInkMaker.sol";

contract InkMaker is IInkMaker, ERC20VotesUpgradeable {
    using ABDKMath64x64 for int128;

    uint public accumulatedPerShare; // 18 decimals
    uint public lastUpdateTimestamp;

    int128 public maxRewardPerSecond;
    int128 public supplyEmissionSoftCap;

    uint public maxMultiplier;
    uint public maxLockup;

    Ink public ink;

    struct StakingInfo {
        uint amount;
        uint totalShares;
        uint lockupPeriod;
        uint lockupTimestamp;
        bool isWithdrawn;
    }

    mapping(address => StakingInfo[]) public stakingInfo;
    mapping(address => uint) public debtOf;

    /// 
    /// @param _ink Ink token address
    /// @param _maxRewardPerDay max ink reward per day, two decimals
    /// @param _supplyEmissionSoftCap max stakings after which emission rate is capped, in ethers, no decimals
    function initialize(
        Ink _ink,
        uint _maxRewardPerDay,
        uint _supplyEmissionSoftCap
    ) initializer public {
        ink = _ink;
        __ERC20Votes_init();
        __ERC20_init_unchained("InkStaking", "sFTM");
        __ERC20Permit_init("InkStaking");

        maxRewardPerSecond = ABDKMath64x64.divu(_maxRewardPerDay, 86400 * 1e2); // x pixels per day
        supplyEmissionSoftCap = ABDKMath64x64.fromUInt(_supplyEmissionSoftCap); // after x fantom staked, emission rate is capped
        maxMultiplier = 7; // 7x staking lock multiplier
        maxLockup = 180 days; // 6 months   
    }

    /// @notice Calculate current emission rate based on total supply. Cubic function.
    /// @param _supply Total supply, two decimals
    /// @return emission rate
    function calcCurrentEmissions(uint _supply) public view returns (uint) {
        uint maxRewardPerSecondUint = maxRewardPerSecond.mulu(1e18);
        if (_supply >= supplyEmissionSoftCap.mulu(1e18)) return maxRewardPerSecondUint;
        
        int128 supply = ABDKMath64x64.divu(_supply, 1e18);
        int128 supplyParameter = maxRewardPerSecond.mul(supply).div(supplyEmissionSoftCap);
        int128 ONE = ABDKMath64x64.fromUInt(1); 

        // ((((supply / max) - 1) ** 3) + 1) * max
        uint emission = ABDKMath64x64.div(supplyParameter, maxRewardPerSecond).sub(ONE).pow(3).add(ONE).mulu(maxRewardPerSecondUint);
        return emission > maxRewardPerSecondUint ? maxRewardPerSecondUint : emission;
    }

    function calcLockupMultiplier(uint amount, uint lockupPeriod) public view returns (uint) {
        require(lockupPeriod <= maxLockup, "calcLockupMultiplier: max lockup exceeded.");
        uint multiplier = (maxMultiplier - 1) * 1e6 * lockupPeriod / maxLockup;
        return amount * multiplier / 1e6 + amount;
    }

    function calcWithdrawalWithPenalty(uint amount, uint lockupPeriod, uint lockupTimestamp) public view returns (uint withdrawable) {
        uint timeDelta = block.timestamp - lockupTimestamp;
        if (timeDelta >= lockupPeriod) {
            withdrawable = amount;
        } else {
            withdrawable = timeDelta * amount / lockupPeriod;
        }
    }

    function getCurrentRewardPerSecond() public view returns (uint) {
        return calcCurrentEmissions(totalSupply());
    }

    function updateShares() public {
        if (totalSupply() == 0) {
            lastUpdateTimestamp = block.timestamp;
            return;
        } else {
            uint256 currentRewardPerSecond = getCurrentRewardPerSecond();
            uint256 timeDelta = block.timestamp - lastUpdateTimestamp;
            uint256 reward = timeDelta * currentRewardPerSecond;
            accumulatedPerShare += reward * 1e18 / totalSupply();
            lastUpdateTimestamp = block.timestamp;
        }
    }

    function stake(uint lockup) public payable {
        // update emissions to this point
        updateShares();

        // send pending ink, if any
        if (balanceOf(msg.sender) > 0) {
            uint pending = (balanceOf(msg.sender) * accumulatedPerShare) / 1e18 - debtOf[msg.sender];
            if (pending > 0) {
                mintInk(msg.sender, pending);
            }
        }

        // stake(0, 0) = claim rewards
        if (msg.value > 0) {
            // store staking info
            StakingInfo memory info = StakingInfo({
                amount: msg.value,
                totalShares: calcLockupMultiplier(msg.value, lockup),
                lockupPeriod: lockup,
                lockupTimestamp: block.timestamp,
                isWithdrawn: false
            });

            stakingInfo[msg.sender].push(info);
            
            // mint accounting tokens
            _mint(msg.sender, info.totalShares);
            emit Staked(msg.sender, msg.value, lockup, info.totalShares, info.lockupTimestamp);
        }
        
        debtOf[msg.sender] = (balanceOf(msg.sender) * accumulatedPerShare) / 1e18;
    }

    function withdraw(uint index) public {
        // safety checks
        StakingInfo memory user = stakingInfo[msg.sender][index];
        require(user.lockupTimestamp + user.lockupPeriod <= block.timestamp, "withdraw: lockup period not over yet.");
        require(!user.isWithdrawn, "withdraw: already withdrawn.");
        
        // update emissions up to this point
        updateShares();

        // send pending rewards
        uint pending = (balanceOf(msg.sender) * accumulatedPerShare) / 1e18 - debtOf[msg.sender];
        if (pending > 0) {
            mintInk(msg.sender, pending);
        }

        // state changes
        stakingInfo[msg.sender][index].isWithdrawn = true;
        _burn(msg.sender, user.totalShares);
        debtOf[msg.sender] = (balanceOf(msg.sender) * accumulatedPerShare) / 1e18;
        
        // withdrawal
        (bool sent,) = msg.sender.call{value: user.amount}("");
        require(sent, "withdraw: failed to send FTM");
        emit Withdrawn(msg.sender, index, user.amount);
    }

    function mintInk(address to, uint256 amount) internal {
        ink.mint(to, amount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override {
        require(from == address(0) || to == address(0), "transfer: can only mint or burn");
    }
}