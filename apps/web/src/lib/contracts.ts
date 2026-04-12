export const NFT_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`) ?? "0x0000000000000000000000000000000000000000";
export const MARKETPLACE_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS as `0x${string}`) ?? "0x0000000000000000000000000000000000000000";

export const STUD_NFT_ABI = [
  { name: "totalSupply", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "ownerOf", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
  { name: "tokenURI", type: "function", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "", type: "string" }] },
  { name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "isApprovedForAll", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_tokenURI", type: "string" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "setApprovalForAll", type: "function", stateMutability: "nonpayable", inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }], outputs: [] },
] as const;

export const MARKETPLACE_ABI = [
  { name: "getActiveListings", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "tuple[]", components: [{ name: "listingId", type: "uint256" }, { name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "seller", type: "address" }, { name: "price", type: "uint256" }, { name: "active", type: "bool" }] }] },
  { name: "getUserListings", type: "function", stateMutability: "view", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "tuple[]", components: [{ name: "listingId", type: "uint256" }, { name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "seller", type: "address" }, { name: "price", type: "uint256" }, { name: "active", type: "bool" }] }] },
  { name: "getListing", type: "function", stateMutability: "view", inputs: [{ name: "listingId", type: "uint256" }], outputs: [{ name: "", type: "tuple", components: [{ name: "listingId", type: "uint256" }, { name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "seller", type: "address" }, { name: "price", type: "uint256" }, { name: "active", type: "bool" }] }] },
  { name: "listNFT", type: "function", stateMutability: "nonpayable", inputs: [{ name: "nftContract", type: "address" }, { name: "tokenId", type: "uint256" }, { name: "price", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "buyNFT", type: "function", stateMutability: "payable", inputs: [{ name: "listingId", type: "uint256" }], outputs: [] },
  { name: "cancelListing", type: "function", stateMutability: "nonpayable", inputs: [{ name: "listingId", type: "uint256" }], outputs: [] },
] as const;
