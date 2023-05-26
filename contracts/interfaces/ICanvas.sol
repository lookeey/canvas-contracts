// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

interface ICanvas {
    event PixelPlaced(address indexed by, int256 indexed x, int256 indexed y, uint256 colorId);
    function getPixel(int256 x, int256 y) external view returns (uint256 colorId);
    function setPixel(int256 x, int256 y, uint256 colorId) external returns (bool success);
}