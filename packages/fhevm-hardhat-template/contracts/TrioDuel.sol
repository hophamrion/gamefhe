// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * TrioDuel — FHEVM state-channel-ish with checkpoint every K rounds (K set in server).
 * This contract accepts encrypted element commitments (once per player) and
 * encrypted skills batched via `applyRounds`.
 *
 * IMPORTANT: Adapted for FHEVM template with correct imports and types
 */
import { FHE, euint8, euint16, ebool, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract TrioDuel is SepoliaConfig {
    uint16 public constant HP0         = 100;
    uint16 public constant DMG_BASE    = 25;
    uint16 public constant BONUS_SKILL = 15;
    uint16 public constant BONUS_ELEM  = 10;

    struct Player {
        euint8 elem;   // 0..2 (encrypted)
        bool   elemSet;
    }

    struct Match {
        address pA;
        address pB;
        uint64  openedAt;
        uint8   roundIdx;     // number of rounds applied
        euint16 hpA;
        euint16 hpB;
        bytes32 transcript;   // public hash of progression
        bool    settled;
        Player  A;
        Player  B;
        // decryption async bookkeeping (optional)
        uint256 lastDecryptReq;
        bool    decryptPending;
        address winnerPlain;  // for finalizeQuick
    }

    uint256 public nextId;
    mapping(uint256 => Match) public matches;

    event MatchOpened(uint256 indexed id, address A, address B);
    event ElementsCommitted(uint256 indexed id);
    event CheckpointApplied(uint256 indexed id, uint8 newRound);
    event WinnerRequested(uint256 indexed id, uint256 requestId);
    event Finalized(uint256 indexed id, address winner);

    // ===== FHE helpers =====
    function beats(euint8 a, euint8 b) internal returns (ebool) {
        // RPS cycle: 0>2, 1>0, 2>1
        ebool c1 = FHE.and(FHE.eq(a, FHE.asEuint8(0)), FHE.eq(b, FHE.asEuint8(2)));
        ebool c2 = FHE.and(FHE.eq(a, FHE.asEuint8(1)), FHE.eq(b, FHE.asEuint8(0)));
        ebool c3 = FHE.and(FHE.eq(a, FHE.asEuint8(2)), FHE.eq(b, FHE.asEuint8(1)));
        return FHE.or(FHE.or(c1, c2), c3);
    }

    function applyDamage(euint16 hp, ebool advSkill, ebool advElem) internal returns (euint16) {
        // dmg = advSkill ? (BASE + (advElem?BONUS_ELEM:0)) : 0
        euint16 base = FHE.asEuint16(DMG_BASE);
        euint16 withElem = FHE.add(base, FHE.asEuint16(BONUS_ELEM));
        euint16 dmgIfSkill = FHE.select(advElem, withElem, base);
        euint16 dmg = FHE.select(advSkill, dmgIfSkill, FHE.asEuint16(0));
        return FHE.sub(hp, dmg);
    }

    // ===== lifecycle =====
    function openMatch(address opponent) external returns (uint256 id) {
        require(opponent != address(0) && opponent != msg.sender, "bad opponent");
        id = ++nextId;
        Match storage m = matches[id];
        m.pA = msg.sender;
        m.pB = opponent;
        m.openedAt = uint64(block.timestamp);
        m.roundIdx = 0;
        m.hpA = FHE.asEuint16(HP0);
        m.hpB = FHE.asEuint16(HP0);
        FHE.allowThis(m.hpA);
        FHE.allowThis(m.hpB);
        m.transcript = keccak256(abi.encode(id, m.pA, m.pB, HP0, HP0));
        emit MatchOpened(id, m.pA, m.pB);
    }

    function commitElementA(uint256 id, externalEuint8 encElem, bytes calldata proof) external {
        Match storage m = matches[id];
        require(msg.sender == m.pA, "not A");
        require(!m.A.elemSet && !m.settled, "already");
        m.A.elem = FHE.fromExternal(encElem, proof);
        m.A.elemSet = true;
        emit ElementsCommitted(id);
    }

    function commitElementB(uint256 id, externalEuint8 encElem, bytes calldata proof) external {
        Match storage m = matches[id];
        require(msg.sender == m.pB, "not B");
        require(!m.B.elemSet && !m.settled, "already");
        m.B.elem = FHE.fromExternal(encElem, proof);
        m.B.elemSet = true;
        emit ElementsCommitted(id);
    }

    function applyRounds(
        uint256 id,
        externalEuint8[] calldata skillsA,
        bytes calldata proofA,
        externalEuint8[] calldata skillsB,
        bytes calldata proofB
    ) public {
        Match storage m = matches[id];
        require(!m.settled, "settled");
        require(m.A.elemSet && m.B.elemSet, "elem?");
        require(skillsA.length == skillsB.length && skillsA.length > 0, "len");

        euint16 hpA = m.hpA;
        euint16 hpB = m.hpB;

        for (uint256 i = 0; i < skillsA.length; i++) {
            euint8 sA = FHE.fromExternal(skillsA[i], proofA);
            euint8 sB = FHE.fromExternal(skillsB[i], proofB);

            ebool advSkillA = beats(sA, sB);
            ebool advSkillB = beats(sB, sA);
            ebool advElemA  = beats(m.A.elem, m.B.elem);
            ebool advElemB  = beats(m.B.elem, m.A.elem);

            hpB = applyDamage(hpB, advSkillA, advElemA);
            hpA = applyDamage(hpA, advSkillB, advElemB);

            m.transcript = keccak256(
                abi.encode(
                    m.transcript,
                    uint8(m.roundIdx + 1),
                    FHE.toBytes32(hpA),
                    FHE.toBytes32(hpB),
                    FHE.toBytes32(sA),
                    FHE.toBytes32(sB)
                )
            );
            m.roundIdx += 1;
        }

        m.hpA = hpA; m.hpB = hpB;
        FHE.allowThis(m.hpA);
        FHE.allowThis(m.hpB);
        emit CheckpointApplied(id, m.roundIdx);
    }

    // Quick finalize (plaintext winner provided off-chain)
    function finalizeQuick(uint256 id, address winner) external {
        Match storage m = matches[id];
        require(!m.settled, "settled");
        require(winner == m.pA || winner == m.pB, "bad winner");
        m.winnerPlain = winner;
        m.settled = true;
        emit Finalized(id, winner);
    }

    // Request decryption for winner resolution (optional)
    function requestWinnerDecryption(uint256 id) external {
        Match storage m = matches[id];
        require(!m.settled && !m.decryptPending, "state");
        bytes32[] memory cts = new bytes32[](2);
        cts[0] = FHE.toBytes32(m.hpA);
        cts[1] = FHE.toBytes32(m.hpB);
        uint256 reqId = FHE.requestDecryption(cts, this.onWinnerDecrypted.selector);
        m.lastDecryptReq = reqId;
        m.decryptPending = true;
        emit WinnerRequested(id, reqId);
    }

    function onWinnerDecrypted(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external returns (bool) {
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        (uint16 hpAclear, uint16 hpBclear) = abi.decode(cleartexts, (uint16, uint16));

        uint256 found;
        for (uint256 i = 1; i <= nextId; i++) {
            if (matches[i].lastDecryptReq == requestId) { found = i; break; }
        }
        require(found != 0, "req?");

        Match storage m = matches[found];
        require(m.decryptPending && !m.settled, "state");
        address winner = hpAclear == 0 && hpBclear == 0 ? address(0)
            : (hpBclear == 0 ? m.pA : (hpAclear == 0 ? m.pB : address(0)));
        require(winner != address(0), "no winner");
        m.winnerPlain = winner;
        m.settled = true;
        m.decryptPending = false;
        emit Finalized(found, winner);
        return true;
    }
}
