// src/lib/contest.ts
import { parseAbi } from "viem";

export const CONTEST_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTEST_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const CONTEST_ABI = parseAbi([
  "function submit(uint256 tokenId) returns (uint256)",
  "function vote(uint256 entryId)",
  "function finalize()",
  "function returnEntries(uint256 contestId, uint256[] entryIds)",
  "function maxEntriesPerWallet() view returns (uint256)",
  "function currentContestId() view returns (uint256)",
  "function hasVoted(uint256 contestId, address voter) view returns (bool)",
  "function votedFor(uint256 contestId, address voter) view returns (uint256)",
  "function entriesOf(uint256 contestId, address account) view returns (uint256)",
  "function getContest(uint256 contestId) view returns ((uint256 id, uint256 startTime, uint256 endTime, bool finalized, uint256 entryCount, uint256 voteCount))",
  "function getEntries(uint256 contestId) view returns ((uint256 id, address owner, uint256 tokenId, uint256 votes, bool returned)[])",
  "function getWinners(uint256 contestId) view returns ((uint256 id, address owner, uint256 tokenId, uint256 votes, bool returned)[])",
]);

export const ERC721_APPROVAL_ABI = parseAbi([
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
  "function setApprovalForAll(address operator, bool approved)",
]);

export const NFT_TOKEN_URI_ABI = parseAbi(["function tokenURI(uint256 tokenId) view returns (string)"]);

export interface ContestEntryView {
  id: number;
  owner: string;
  tokenId: string;
  votes: number;
  returned: boolean;
  name: string;
  description: string;
  image: string;
}

export interface ContestInfoView {
  id: number;
  startTime: number;
  endTime: number;
  finalized: boolean;
  entryCount: number;
  voteCount: number;
}

export interface PastContestView {
  contest: ContestInfoView;
  winners: ContestEntryView[];
  /** entry ids whose NFT has not been returned to the owner yet */
  unreturnedIds: number[];
  /** the subset of unreturnedIds owned by the connected wallet */
  myPendingIds: number[];
}

export interface ContestResponse {
  configured: boolean;
  now: number;
  maxEntriesPerWallet: number;
  current: ContestInfoView | null;
  entries: ContestEntryView[];
  leaders: ContestEntryView[];
  my: { hasVoted: boolean; votedFor: number | null; entriesCount: number };
  past: PastContestView[];
  error?: string;
}
