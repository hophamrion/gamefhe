import 'dotenv/config';
import express from 'express';
import { ethers } from 'ethers';
import DuelAbi from '../../contracts/artifacts/contracts/TrioDuel.sol/TrioDuel.json' assert { type: 'json' };
// NOTE: Adjust import name if SDK differs
import { FhevmInstance } from '@zama-fhe/relayer-sdk';

const app = express();
app.use(express.json());

const RPC   = process.env.RPC!;
const PK    = process.env.PRIVATE_KEY!;
const DUEL  = process.env.DUEL_ADDR!;
const PORT  = Number(process.env.PORT || 8787);
const K     = Number(process.env.CHECKPOINT_K || 3);

const provider = new ethers.JsonRpcProvider(RPC);
const wallet   = new ethers.Wallet(PK, provider);
const duel     = new ethers.Contract(DUEL, DuelAbi.abi, wallet);

const fhe = await FhevmInstance.create({ apiKey: process.env.RELAYER_API_KEY! });

type Side = 'A' | 'B';
type SkillReq = { matchId: number; who: Side; skill: number; player: string };

type Bucket = { A: string[]; B: string[]; proofA?: string; proofB?: string };
const pending: Record<string, Bucket> = {};

// Register encrypted skill from a player (returns handle)
app.post('/api/skill', async (req, res) => {
  try {
    const { matchId, who, skill, player } = req.body as SkillReq;
    if (![0,1,2].includes(Number(skill))) return res.status(400).json({ ok:false, err:'skill 0..2' });
    const key = String(matchId);
    pending[key] ??= { A: [], B: [] };

    // 1) Register input for DUEL contract & this user address
    const input = fhe.createEncryptedInput(DUEL, player);
    input.add8(BigInt(skill)); // encrypted uint8
    const enc = await input.encrypt(); // => { handles: string[], inputProof: string }

    if (who === 'A') {
      pending[key].A.push(enc.handles[0]);
      pending[key].proofA = enc.inputProof;
    } else {
      pending[key].B.push(enc.handles[0]);
      pending[key].proofB = enc.inputProof;
    }

    // If we have K from both, checkpoint
    if (pending[key].A.length >= K && pending[key].B.length >= K) {
      const takeA = pending[key].A.splice(0, K);
      const takeB = pending[key].B.splice(0, K);
      const proofA = pending[key].proofA!;
      const proofB = pending[key].proofB!;
      const tx = await duel.applyRounds(matchId, takeA, proofA, takeB, proofB, { gasLimit: 3_000_000 });
      await tx.wait();
      console.log(`[checkpoint] match ${matchId} applied K=${K} rounds → tx=${tx.hash}`);
    }

    res.json({ ok:true, handle: enc.handles[0] });
  } catch (e:any) {
    console.error(e);
    res.status(500).json({ ok:false, err: String(e.message || e) });
  }
});

// Force checkpoint now (regardless of count)
app.post('/api/checkpoint', async (req, res) => {
  try {
    const { matchId } = req.body as { matchId:number };
    const key = String(matchId);
    const bucket = pending[key];
    if (!bucket || bucket.A.length === 0 || bucket.B.length === 0) {
      return res.status(400).json({ ok:false, err:'nothing to checkpoint' });
    }
    const take = Math.min(bucket.A.length, bucket.B.length);
    const takeA = bucket.A.splice(0, take);
    const takeB = bucket.B.splice(0, take);
    const tx = await duel.applyRounds(matchId, takeA, bucket.proofA!, takeB, bucket.proofB!, { gasLimit: 3_000_000 });
    await tx.wait();
    console.log(`[checkpoint/manual] match ${matchId} applied n=${take} → tx=${tx.hash}`);
    res.json({ ok:true, tx: tx.hash });
  } catch (e:any) {
    console.error(e);
    res.status(500).json({ ok:false, err: String(e.message || e) });
  }
});

app.listen(PORT, () => console.log(`Aggregator on http://localhost:${PORT}`));
