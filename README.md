# 🐮 Vaquita Premium

A consumer-friendly premium vault platform built on Avalanche Fuji testnet. Deposit USDC into our managed vault and watch your Vaquita mascot grow with each deposit!

## 🌟 What is Vaquita Premium?

Vaquita Premium is a premium subscription service that combines HTTP 402 payment protocol with a managed vault system. Users subscribe to premium access and can deposit USDC into our Multi-Strategy Vault (MSV) to earn yields while enjoying premium features.

### Key Features

- **Premium Subscription**: Subscribe using HTTP 402 payment protocol (pay only $0.01 USDC)
- **Managed Vault Deposits**: Deposit any amount of USDC into our managed vault
- **Interactive Mascot**: Watch your Vaquita cow mascot grow and shake with each deposit
- **Real-time Balance**: Track your vault balance in real-time
- **Easy Withdrawals**: Withdraw your funds anytime

## 🚀 Getting Started

### Prerequisites

- A Web3 wallet (MetaMask, Coinbase Wallet, etc.)
- Some AVAX on Avalanche Fuji testnet for gas fees
- USDC tokens on Avalanche Fuji testnet

### Quick Start

1. **Connect Your Wallet**
   - Click the "Connect Wallet" button in the top right
   - Approve the connection request

2. **Subscribe to Premium**
   - Enter the amount you want to deposit (or use quick select: $0.10, $0.50, or $1.00)
   - Click "Subscribe to Premium" to unlock premium features
   - Pay $0.01 USDC via HTTP 402 payment protocol

3. **Deposit to Vault**
   - After subscribing, click "Deposit" to add USDC to the managed vault
   - Approve USDC spending if needed
   - Watch your balance grow and the Vaquita mascot animate!

4. **Withdraw Anytime**
   - Click "Withdraw" to remove your funds from the vault
   - Funds are sent back to your wallet

## 📋 Smart Contracts

### MSV Contract (Multi-Strategy Vault)
**Address**: [`0x1c3efaAea2772863ff5848A3B09c2b0af48685ec`](https://testnet.snowtrace.io/address/0x1c3efaAea2772863ff5848A3B09c2b0af48685ec)

This is the managed vault contract where your USDC deposits are held and managed.

### Payment Address
**Address**: [`0xbe9078b15baa4a7e3a0848a2a4adef6014b2dbff`](https://testnet.snowtrace.io/address/0xbe9078b15baa4a7e3a0848a2a4adef6014b2dbff)

This address receives premium subscription payments.

## 💡 How It Works

1. **Subscription Flow**
   - User connects wallet and selects deposit amount
   - Clicks "Subscribe to Premium" → HTTP 402 payment protocol initiates
   - User signs payment authorization for $0.01 USDC
   - Premium access is granted

2. **Deposit Flow**
   - After subscription, user clicks "Deposit"
   - USDC approval transaction (if needed)
   - Deposit transaction to MSV contract
   - Balance updates and mascot animates

3. **Withdrawal Flow**
   - User clicks "Withdraw"
   - Withdrawal transaction from MSV contract
   - Funds returned to user's wallet
   - Balance updates and mascot shrinks

## 🎨 User Experience

- **Interactive Mascot**: The Vaquita cow mascot grows in size as your balance increases and shakes with each successful deposit
- **Real-time Updates**: Balance updates automatically after each transaction
- **Status Messages**: Clear status messages guide you through each step
- **Modern UI**: Clean, intuitive interface built with modern web technologies

## 🔧 Technical Details

### Built With

- **Next.js 16** - React framework
- **Thirdweb SDK v5** - Web3 infrastructure
- **HTTP 402 Protocol** - Payment protocol integration
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components

### Network

- **Chain**: Avalanche Fuji Testnet
- **Chain ID**: 43113
- **Explorer**: [Snowtrace Testnet](https://testnet.snowtrace.io/)

## 📝 Environment Variables

For developers running locally:

```bash
NEXT_PUBLIC_THIRDWEB_CLIENT_ID=your_client_id
THIRDWEB_SECRET_KEY=your_secret_key
THIRDWEB_SERVER_WALLET_ADDRESS=your_facilitator_address
MERCHANT_WALLET_ADDRESS=0xbe9078b15baa4a7e3a0848a2a4adef6014b2dbff
PRIVATE_KEY=your_private_key
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## 📄 License

This project is open source and available for use.

## 🤝 Support

For questions or issues, please open an issue on GitHub or contact the development team.

---

**Note**: This is a testnet application. All transactions occur on Avalanche Fuji testnet using test tokens.
