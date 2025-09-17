# TrioDuel Integration Setup Guide

## 1. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Hardhat configuration
MNEMONIC="your_mnemonic_phrase_here"
INFURA_API_KEY="your_infura_api_key_here"
ETHERSCAN_API_KEY="your_etherscan_api_key_here"

# For TrioDuel game
DUEL_ADDR="0x0000000000000000000000000000000000000000"  # Will be set after deployment
RELAYER_API_KEY="your_relayer_api_key_here"
```

## 2. Deploy TrioDuel Contract

```bash
cd packages/fhevm-hardhat-template
npm run compile
npx hardhat deploy --tags TrioDuel --network sepolia
```

After deployment, copy the contract address and update `DUEL_ADDR` in your `.env` file.

## 3. Setup Aggregator Server

The aggregator server is now available in the `aggregator/` directory. Set it up as follows:

```bash
cd aggregator
cp env.example .env
# Edit .env with your configuration
npm install
npm run dev
```

Configure the `.env` file in the aggregator directory:
- `RPC`: Your Sepolia RPC URL
- `PRIVATE_KEY`: Private key for the server wallet
- `DUEL_ADDR`: Address of the deployed TrioDuel contract
- `RELAYER_API_KEY`: Your Relayer SDK API key
- `PORT`: Server port (default: 8787)
- `CHECKPOINT_K`: Number of rounds before checkpoint (default: 3)

## 4. Frontend Integration

The Pixel Duel frontend has been integrated into the main site template. Access it at `/pixel-duel` route.

To run the frontend:
```bash
cd packages/site
npm install
npm run dev
```

## 5. Network Configuration

The Sepolia network is already configured in `hardhat.config.ts`. Make sure you have:
- Valid RPC URL (Infura or Alchemy)
- Private key or mnemonic with Sepolia ETH
- Relayer API key for encrypted transactions

## 6. Complete Setup Steps

1. **Deploy Contract**: Deploy TrioDuel to Sepolia
2. **Update ABI**: Copy the contract ABI to `aggregator/src/abi/TrioDuel.json`
3. **Configure Aggregator**: Set up the aggregator server with contract address
4. **Run Services**: Start both the aggregator server and the frontend
5. **Test Game**: Access `/pixel-duel` in your browser

## 7. File Structure

```
fhevm-react-template/
├── packages/
│   ├── fhevm-hardhat-template/
│   │   ├── contracts/TrioDuel.sol          # ✅ Integrated
│   │   └── deploy/deployTrioDuel.ts        # ✅ Created
│   └── site/
│       ├── app/pixel-duel/page.tsx         # ✅ Created
│       └── components/pixel/PixelDuelUI.tsx # ✅ Created
├── aggregator/                             # ✅ Created
│   ├── src/index.ts
│   ├── package.json
│   └── README.md
└── TRIODUEL_SETUP.md                       # ✅ This guide
```
