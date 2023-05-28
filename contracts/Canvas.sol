// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./Ink.sol";
import "./interfaces/ICanvas.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Canvas is ICanvas, Initializable {
    mapping(int256 => mapping(int256 => uint256)) pixels;
    Ink ink;

    function initialize(address _ink) initializer public {
        ink = Ink(_ink);
    }

    function getPixel(int256 x, int256 y)
        external
        view
        returns (uint256 colorId)
    {
        return pixels[x][y];
    }

    function setPixel(
        int256 x,
        int256 y,
        uint256 colorId
    ) external returns (bool success) {
        _beforePixelPlaced(msg.sender, x, y, colorId);
        pixels[x][y] = colorId;
        emit PixelPlaced(msg.sender, x, y, colorId);
        return true;
    }

    function _beforePixelPlaced(
        address by,
        int256 x,
        int256 y,
        uint256 colorId
    ) internal virtual {
        require(colorId < 24, "Canvas: unknown color");
        ink.burn(by, 1e18); // spends allowance, see `Ink`
    }
}
