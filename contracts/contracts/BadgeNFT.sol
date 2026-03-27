// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BadgeNFT is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    constructor() ERC721("EDIBadge2026", "EDI26") Ownable(msg.sender) {}

    function mintBadge(address recipient, string calldata tokenURI) external onlyOwner returns (uint256) {
        uint256 tokenId;
        unchecked {
            tokenId = nextTokenId++;
        }
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);
        return tokenId;
    }
}
