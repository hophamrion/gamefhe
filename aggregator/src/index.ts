import 'dotenv/config';
import express from 'express';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';
import { join } from 'path';

// Import ABI from deployed contract
const DuelAbi = JSON.parse(readFileSync(join(__dirname, 'abi', 'TrioDuel.json'), 'utf8'));

const app = express();
app.use(express.json());

const RPC   = process.env.RPC!;
const PK    = process.env.PRIVATE_KEY!;
const DUEL  = process.env.DUEL_ADDR!;
const PORT  = Number(process.env.PORT || 8787);
const K     = Number(process.env.CHECKPOINT_K || 3);

const provider = new ethers.JsonRpcProvider(RPC);
const wallet   = new ethers.Wallet(PK, provider);

// Create contract instance with ABI
const duel = new ethers.Contract(DUEL, DuelAbi.abi, wallet);

let fhe: any;

type Side = 'A' | 'B';
type BatchReq = { matchId: number; who: Side; handles: string[]; proof: string };

type BatchBucket = { A?: BatchReq; B?: BatchReq };
const pendingBatches: Record<string, BatchBucket> = {};

// Initialize server (no FHE needed - client handles encryption)
async function initServer() {
  console.log('🚀 Aggregator server initialized');
  console.log('📋 Client-side encryption flow:');
  console.log('   1. Browser uses Relayer SDK to encrypt skills');
  console.log('   2. Client sends batch of K=3 encrypted skills');
  console.log('   3. Server applies rounds when both players ready');
  console.log('✅ Server ready to receive encrypted batches!');
}

// Receive encrypted batch from client
app.post('/api/batch', async (req, res) => {
  try {
    const { matchId, who, handles, proof } = req.body as BatchReq;
    
    // Validate batch
    if (!handles || handles.length !== K) {
      return res.status(400).json({ ok: false, err: `Expected ${K} handles, got ${handles?.length || 0}` });
    }
    if (!proof) {
      return res.status(400).json({ ok: false, err: 'Missing proof' });
    }
    
    const key = String(matchId);
    pendingBatches[key] ??= {};
    
    // Store batch
    pendingBatches[key][who] = { matchId, who, handles, proof };
    console.log(`[batch] Received ${who} batch for match ${matchId}: ${handles.length} handles`);
    
    // Check if both players have sent their batches
    if (pendingBatches[key].A && pendingBatches[key].B) {
      const batchA = pendingBatches[key].A!;
      const batchB = pendingBatches[key].B!;
      
      console.log(`[checkpoint] Both batches ready for match ${matchId}, applying rounds...`);
      
      // Apply rounds to contract
      const tx = await duel.applyRounds(
        matchId, 
        batchA.handles, 
        batchA.proof, 
        batchB.handles, 
        batchB.proof, 
        { gasLimit: 3_000_000 }
      );
      
      await tx.wait();
      console.log(`[checkpoint] Match ${matchId} applied K=${K} rounds → tx=${tx.hash}`);
      
      // Clear batches
      delete pendingBatches[key];
      
      res.json({ ok: true, tx: tx.hash, message: 'Rounds applied successfully' });
    } else {
      res.json({ ok: true, message: `Waiting for ${who === 'A' ? 'B' : 'A'} batch` });
    }
  } catch (e: any) {
    console.error('Batch processing error:', e);
    res.status(500).json({ ok: false, err: String(e.message || e) });
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
    
    // Apply rounds to contract
    const tx = await duel.applyRounds(matchId, takeA, bucket.proofA!, takeB, bucket.proofB!, { gasLimit: 3_000_000 });
    await tx.wait();
    console.log(`[checkpoint/manual] match ${matchId} applied n=${take} → tx=${tx.hash}`);
    res.json({ ok:true, tx: tx.hash });
  } catch (e:any) {
    console.error(e);
    res.status(500).json({ ok:false, err: String(e.message || e) });
  }
});

// Start server
app.listen(PORT, async () => {
  console.log(`Aggregator on http://localhost:${PORT}`);
  await initServer();
});
