// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/ICanvas.sol";

contract Ink is ERC20Upgradeable, OwnableUpgradeable {
    ICanvas canvas;

    function initialize(ICanvas canvas_) initializer public {
        __ERC20_init("Ink", "INK");
        __Ownable_init_unchained();
        canvas = canvas_;
    }

    modifier onlyCanvas() {
        require(msg.sender == address(canvas), "Ink: only canvas");
        _;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyCanvas {
        _burn(from, amount);
    }

    // spend allowances when burning token in `Canvas`
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        if (to == address(0)) {
            // burn
            _spendAllowance(from, msg.sender, amount);
        }
    }
}