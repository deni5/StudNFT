// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StudNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    event Minted(uint256 indexed tokenId, address indexed owner, string tokenURI);

    constructor() ERC721("StudNFT", "SNFT") Ownable(msg.sender) {}

    /// @notice Mint a new NFT with on-chain token URI
    /// @param _tokenURI Metadata URI (IPFS or data URI)
    /// @return tokenId The newly minted token ID
    function mint(string calldata _tokenURI) external returns (uint256) {
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        emit Minted(tokenId, msg.sender, _tokenURI);
        return tokenId;
    }

    /// @notice Total number of minted tokens
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /// @notice Owner of a specific token
    function tokenOwner(uint256 tokenId) external view returns (address) {
        return ownerOf(tokenId);
    }
}
