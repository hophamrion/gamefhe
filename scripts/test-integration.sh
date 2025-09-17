#!/bin/bash

# Test script for TrioDuel integration
echo "🎮 Testing TrioDuel Integration..."

# Check if contract compiles
echo "📦 Compiling TrioDuel contract..."
cd packages/fhevm-hardhat-template
npm run compile

if [ $? -eq 0 ]; then
    echo "✅ Contract compilation successful"
else
    echo "❌ Contract compilation failed"
    exit 1
fi

# Check if frontend builds
echo "🌐 Building frontend..."
cd ../site
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful"
else
    echo "❌ Frontend build failed"
    exit 1
fi

# Check aggregator setup
echo "🔧 Checking aggregator setup..."
cd ../../aggregator

if [ -f "package.json" ] && [ -f "src/index.ts" ]; then
    echo "✅ Aggregator files present"
else
    echo "❌ Aggregator setup incomplete"
    exit 1
fi

echo "🎉 Integration test completed successfully!"
echo ""
echo "Next steps:"
echo "1. Deploy contract: cd packages/fhevm-hardhat-template && npx hardhat deploy --tags TrioDuel --network sepolia"
echo "2. Setup aggregator: cd ../../aggregator && npm install && npm run dev"
echo "3. Run frontend: cd ../packages/site && npm run dev"
echo "4. Access game at: http://localhost:3000/pixel-duel"
