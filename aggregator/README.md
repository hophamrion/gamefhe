# TrioDuel Aggregator Server

This is the aggregator server for the TrioDuel FHEVM game. It handles encrypted skill submissions and automatically checkpoints every K rounds.

## Setup

1. Copy `env.example` to `.env` and configure:
   ```bash
   cp env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your `.env` file:
   - `RPC`: Your Sepolia RPC URL
   - `PRIVATE_KEY`: Private key for the server wallet
   - `DUEL_ADDR`: Address of the deployed TrioDuel contract
   - `RELAYER_API_KEY`: Your Relayer SDK API key
   - `PORT`: Server port (default: 8787)
   - `CHECKPOINT_K`: Number of rounds before checkpoint (default: 3)

## Running

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## API Endpoints

- `POST /api/skill`: Submit encrypted skill
- `POST /api/checkpoint`: Force checkpoint

## Notes

- The server automatically checkpoints every K rounds when both players have submitted enough skills
- You need to deploy the TrioDuel contract first and update the ABI in the code
- Make sure your server wallet has enough Sepolia ETH for gas fees
