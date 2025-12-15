#!/bin/bash

BASE_URL="http://localhost:3000"

echo "1. Creating Wallet A..."
RESP_A=$(curl -s -X POST $BASE_URL/wallets -H "Content-Type: application/json" -d '{}')
ID_A=$(echo $RESP_A | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   Wallet A ID: $ID_A"

echo "2. Creating Wallet B..."
RESP_B=$(curl -s -X POST $BASE_URL/wallets -H "Content-Type: application/json" -d '{}')
ID_B=$(echo $RESP_B | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "   Wallet B ID: $ID_B"

echo "3. Funding Wallet A with 1000 cents..."
curl -s -X POST $BASE_URL/wallets/$ID_A/fund \
  -H "Content-Type: application/json" \
  -d "{\"amount\": 1000, \"reference\": \"fund_ref_$RANDOM\"}"
echo ""

echo "4. Transferring 400 cents from A to B..."
curl -s -X POST $BASE_URL/wallets/transfer \
  -H "Content-Type: application/json" \
  -d "{
    \"fromWalletId\": \"$ID_A\",
    \"toWalletId\": \"$ID_B\",
    \"amount\": 400,
    \"reference\": \"transfer_ref_$RANDOM\"
  }"
echo ""

echo "5. Verifying Wallet A (Expected Balance: 600)..."
curl -s $BASE_URL/wallets/$ID_A
echo ""

echo "6. Verifying Wallet B (Expected Balance: 400)..."
curl -s $BASE_URL/wallets/$ID_B
echo ""
