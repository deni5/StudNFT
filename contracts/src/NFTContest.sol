// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title NFTContest
/// @notice Quarterly NFT contest for StudNFT tokens.
///         - Participants lock their NFT in this contract for the whole contest.
///         - Every wallet has exactly one vote per contest; voting for an own NFT is forbidden.
///         - After the deadline anyone may finalize the contest; the top 3 entries are recorded
///           and the next contest (3 calendar months) is opened automatically.
///         - NFTs are returned to their original owners after the deadline.
/// @dev Deadlines are expressed in fixed UTC+2 (Kyiv winter time): a contest ends at 23:59:59 on the
///      last day of its period.
contract NFTContest is Ownable {
    struct Contest {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        bool finalized;
        uint256 entryCount;
        uint256 voteCount;
    }

    struct Entry {
        uint256 id;
        address owner;
        uint256 tokenId;
        uint256 votes;
        bool returned;
    }

    IERC721 public immutable nft;
    int256 public constant TZ_OFFSET = 2 hours;
    uint256 public constant MAX_WINNERS = 3;
    uint256 public maxEntriesPerWallet = 5;
    uint256 public currentContestId;

    mapping(uint256 => Contest) private _contests;
    mapping(uint256 => Entry[]) private _entries;
    mapping(uint256 => uint256[3]) private _top; // entryId + 1, 0 = empty slot
    mapping(uint256 => mapping(address => bool)) private _hasVoted;
    mapping(uint256 => mapping(address => uint256)) private _votedFor; // entryId + 1
    mapping(uint256 => mapping(address => uint256)) private _entriesOf;

    event ContestStarted(uint256 indexed contestId, uint256 startTime, uint256 endTime);
    event EntrySubmitted(uint256 indexed contestId, uint256 indexed entryId, address indexed owner, uint256 tokenId);
    event Voted(uint256 indexed contestId, uint256 indexed entryId, address indexed voter);
    event ContestFinalized(uint256 indexed contestId, uint256[3] winnerEntryIds, uint256 winnersCount);
    event EntryReturned(uint256 indexed contestId, uint256 indexed entryId, address indexed owner, uint256 tokenId);
    event MaxEntriesUpdated(uint256 value);

    constructor(address _nft, uint256 firstEnd) Ownable(msg.sender) {
        require(_nft != address(0), "Contest: zero nft");
        require(firstEnd > block.timestamp, "Contest: end in the past");
        nft = IERC721(_nft);
        _openContest(block.timestamp, firstEnd);
    }

    function submit(uint256 tokenId) external returns (uint256 entryId) {
        Contest storage c = _contests[currentContestId];
        require(block.timestamp >= c.startTime && block.timestamp <= c.endTime, "Contest: not open");
        require(_entriesOf[c.id][msg.sender] < maxEntriesPerWallet, "Contest: entry limit reached");
        require(nft.ownerOf(tokenId) == msg.sender, "Contest: not token owner");

        entryId = _entries[c.id].length;
        _entries[c.id].push(Entry({ id: entryId, owner: msg.sender, tokenId: tokenId, votes: 0, returned: false }));
        _entriesOf[c.id][msg.sender] += 1;
        c.entryCount += 1;

        nft.transferFrom(msg.sender, address(this), tokenId);
        emit EntrySubmitted(c.id, entryId, msg.sender, tokenId);
    }

    function vote(uint256 entryId) external {
        Contest storage c = _contests[currentContestId];
        require(block.timestamp >= c.startTime && block.timestamp <= c.endTime, "Contest: not open");
        require(entryId < _entries[c.id].length, "Contest: no such entry");
        require(!_hasVoted[c.id][msg.sender], "Contest: already voted");

        Entry storage e = _entries[c.id][entryId];
        require(e.owner != msg.sender, "Contest: cannot vote for own entry");

        _hasVoted[c.id][msg.sender] = true;
        _votedFor[c.id][msg.sender] = entryId + 1;
        e.votes += 1;
        c.voteCount += 1;

        _updateTop(c.id, entryId);
        emit Voted(c.id, entryId, msg.sender);
    }

    function finalize() external {
        Contest storage c = _contests[currentContestId];
        require(block.timestamp > c.endTime, "Contest: still running");
        require(!c.finalized, "Contest: already finalized");

        c.finalized = true;

        uint256[3] memory ids;
        uint256 count;
        for (uint256 i = 0; i < MAX_WINNERS; i++) {
            if (_top[c.id][i] != 0) {
                ids[i] = _top[c.id][i] - 1;
                count++;
            }
        }
        emit ContestFinalized(c.id, ids, count);

        uint256 start = c.endTime + 1;
        uint256 end = _nextEnd(c.endTime);
        for (uint256 i = 0; i < 40 && end < block.timestamp; i++) {
            start = end + 1;
            end = _nextEnd(end);
        }
        _openContest(start, end);
    }

    function returnEntries(uint256 contestId, uint256[] calldata entryIds) external {
        Contest storage c = _contests[contestId];
        require(c.id == contestId && contestId != 0, "Contest: unknown");
        require(block.timestamp > c.endTime, "Contest: still running");

        for (uint256 i = 0; i < entryIds.length; i++) {
            require(entryIds[i] < _entries[contestId].length, "Contest: no such entry");
            Entry storage e = _entries[contestId][entryIds[i]];
            if (e.returned) continue;
            e.returned = true;
            nft.transferFrom(address(this), e.owner, e.tokenId);
            emit EntryReturned(contestId, e.id, e.owner, e.tokenId);
        }
    }

    function setMaxEntriesPerWallet(uint256 value) external onlyOwner {
        require(value > 0 && value <= 50, "Contest: invalid limit");
        maxEntriesPerWallet = value;
        emit MaxEntriesUpdated(value);
    }

    function getContest(uint256 contestId) external view returns (Contest memory) {
        return _contests[contestId];
    }

    function getEntryCount(uint256 contestId) external view returns (uint256) {
        return _entries[contestId].length;
    }

    function getEntries(uint256 contestId) external view returns (Entry[] memory) {
        return _entries[contestId];
    }

    function getEntry(uint256 contestId, uint256 entryId) external view returns (Entry memory) {
        require(entryId < _entries[contestId].length, "Contest: no such entry");
        return _entries[contestId][entryId];
    }

    function getWinners(uint256 contestId) external view returns (Entry[] memory winners) {
        uint256 count;
        for (uint256 i = 0; i < MAX_WINNERS; i++) if (_top[contestId][i] != 0) count++;
        winners = new Entry[](count);
        for (uint256 i = 0; i < count; i++) winners[i] = _entries[contestId][_top[contestId][i] - 1];
    }

    function hasVoted(uint256 contestId, address voter) external view returns (bool) {
        return _hasVoted[contestId][voter];
    }

    function votedFor(uint256 contestId, address voter) external view returns (uint256) {
        return _votedFor[contestId][voter];
    }

    function entriesOf(uint256 contestId, address account) external view returns (uint256) {
        return _entriesOf[contestId][account];
    }

    function isOpen() external view returns (bool) {
        Contest storage c = _contests[currentContestId];
        return block.timestamp >= c.startTime && block.timestamp <= c.endTime;
    }

    function _openContest(uint256 start, uint256 end) internal {
        currentContestId += 1;
        _contests[currentContestId] = Contest({
            id: currentContestId,
            startTime: start,
            endTime: end,
            finalized: false,
            entryCount: 0,
            voteCount: 0
        });
        emit ContestStarted(currentContestId, start, end);
    }

    function _updateTop(uint256 contestId, uint256 entryId) internal {
        uint256[3] storage t = _top[contestId];
        Entry[] storage list = _entries[contestId];

        uint256 pos = MAX_WINNERS;
        for (uint256 i = 0; i < MAX_WINNERS; i++) {
            if (t[i] == entryId + 1) {
                pos = i;
                break;
            }
        }

        if (pos == MAX_WINNERS) {
            for (uint256 i = 0; i < MAX_WINNERS; i++) {
                if (t[i] == 0) {
                    t[i] = entryId + 1;
                    pos = i;
                    break;
                }
            }
            if (pos == MAX_WINNERS) {
                if (list[entryId].votes > list[t[MAX_WINNERS - 1] - 1].votes) {
                    t[MAX_WINNERS - 1] = entryId + 1;
                    pos = MAX_WINNERS - 1;
                } else {
                    return;
                }
            }
        }

        while (pos > 0 && list[t[pos] - 1].votes > list[t[pos - 1] - 1].votes) {
            (t[pos], t[pos - 1]) = (t[pos - 1], t[pos]);
            pos--;
        }
    }

    function _nextEnd(uint256 prevEnd) internal pure returns (uint256) {
        int256 localStart = int256(prevEnd) + 1 + TZ_OFFSET;
        (int256 y, int256 m, ) = _civilFromDays(localStart / 1 days);
        m += 3;
        if (m > 12) {
            m -= 12;
            y += 1;
        }
        int256 endExclusiveLocal = _daysFromCivil(y, m, 1) * 1 days;
        return uint256(endExclusiveLocal - 1 - TZ_OFFSET);
    }

    function _daysFromCivil(int256 y, int256 m, int256 d) internal pure returns (int256) {
        if (m <= 2) y -= 1;
        int256 era = (y >= 0 ? y : y - 399) / 400;
        int256 yoe = y - era * 400;
        int256 doy = (153 * (m + (m > 2 ? -3 : int256(9))) + 2) / 5 + d - 1;
        int256 doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
        return era * 146097 + doe - 719468;
    }

    function _civilFromDays(int256 z) internal pure returns (int256 y, int256 m, int256 d) {
        z += 719468;
        int256 era = (z >= 0 ? z : z - 146096) / 146097;
        int256 doe = z - era * 146097;
        int256 yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
        y = yoe + era * 400;
        int256 doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
        int256 mp = (5 * doy + 2) / 153;
        d = doy - (153 * mp + 2) / 5 + 1;
        m = mp < 10 ? mp + 3 : mp - 9;
        if (m <= 2) y += 1;
    }
}
