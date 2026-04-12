// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTMarketplace is ReentrancyGuard, Ownable {
    uint256 private _listingIdCounter;

    /// Platform fee in basis points (250 = 2.5%)
    uint256 public constant PLATFORM_FEE_BPS = 250;
    address public platformFeeRecipient;

    struct Listing {
        uint256 listingId;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        uint256 price;
        bool active;
    }

    /// listingId => Listing
    mapping(uint256 => Listing) private _listings;

    /// seller => listingIds
    mapping(address => uint256[]) private _userListings;

    event Listed(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        uint256 price
    );

    event Sold(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price
    );

    event Cancelled(
        uint256 indexed listingId,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller
    );

    constructor(address _platformFeeRecipient) Ownable(msg.sender) {
        platformFeeRecipient = _platformFeeRecipient;
    }

    /// @notice List an NFT for sale. Caller must have approved this contract first.
    /// @param nftContract Address of the ERC-721 contract
    /// @param tokenId Token ID to list
    /// @param price Sale price in wei
    /// @return listingId The new listing identifier
    function listNFT(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external returns (uint256) {
        require(price > 0, "NFTMarketplace: price must be > 0");
        require(
            IERC721(nftContract).ownerOf(tokenId) == msg.sender,
            "NFTMarketplace: caller is not token owner"
        );
        require(
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)) ||
                IERC721(nftContract).getApproved(tokenId) == address(this),
            "NFTMarketplace: marketplace not approved"
        );

        uint256 listingId = _listingIdCounter++;

        _listings[listingId] = Listing({
            listingId: listingId,
            nftContract: nftContract,
            tokenId: tokenId,
            seller: payable(msg.sender),
            price: price,
            active: true
        });

        _userListings[msg.sender].push(listingId);

        emit Listed(listingId, nftContract, tokenId, msg.sender, price);
        return listingId;
    }

    /// @notice Buy a listed NFT by paying the exact price
    /// @param listingId The listing to purchase
    function buyNFT(uint256 listingId) external payable nonReentrant {
        Listing storage listing = _listings[listingId];

        require(listing.active, "NFTMarketplace: listing not active");
        require(msg.value == listing.price, "NFTMarketplace: incorrect ETH amount");
        require(msg.sender != listing.seller, "NFTMarketplace: seller cannot buy own listing");

        listing.active = false;

        // Calculate platform fee and seller proceeds
        uint256 fee = (listing.price * PLATFORM_FEE_BPS) / 10_000;
        uint256 sellerProceeds = listing.price - fee;

        // Transfer NFT to buyer
        IERC721(listing.nftContract).safeTransferFrom(
            listing.seller,
            msg.sender,
            listing.tokenId
        );

        // Pay seller
        listing.seller.transfer(sellerProceeds);

        // Pay platform
        payable(platformFeeRecipient).transfer(fee);

        emit Sold(
            listingId,
            listing.nftContract,
            listing.tokenId,
            listing.seller,
            msg.sender,
            listing.price
        );
    }

    /// @notice Cancel a listing. Only the seller may cancel.
    /// @param listingId Listing to cancel
    function cancelListing(uint256 listingId) external {
        Listing storage listing = _listings[listingId];
        require(listing.active, "NFTMarketplace: listing not active");
        require(msg.sender == listing.seller, "NFTMarketplace: caller is not seller");

        listing.active = false;

        emit Cancelled(listingId, listing.nftContract, listing.tokenId, msg.sender);
    }

    /// @notice Get details of a specific listing
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    /// @notice Get all active listings
    /// @dev O(n) — suitable for testnet scale
    function getActiveListings() external view returns (Listing[] memory) {
        uint256 total = _listingIdCounter;
        uint256 activeCount;

        for (uint256 i = 0; i < total; i++) {
            if (_listings[i].active) activeCount++;
        }

        Listing[] memory active = new Listing[](activeCount);
        uint256 idx;
        for (uint256 i = 0; i < total; i++) {
            if (_listings[i].active) {
                active[idx++] = _listings[i];
            }
        }
        return active;
    }

    /// @notice Get all listings (active and inactive) for a given seller
    function getUserListings(address user) external view returns (Listing[] memory) {
        uint256[] storage ids = _userListings[user];
        Listing[] memory result = new Listing[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = _listings[ids[i]];
        }
        return result;
    }

    /// @notice Update the platform fee recipient address
    function setPlatformFeeRecipient(address _recipient) external onlyOwner {
        platformFeeRecipient = _recipient;
    }
}
