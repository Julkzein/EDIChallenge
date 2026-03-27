# ELCA EDI Challenge 2026 - Badge Generator 🚀

A full-stack, gasless, 3D-interactive, AI-powered ELCA NFT Badge generator built for the EDI Challenge 2026. 

## 🌟 Key Features
- **Swiss ELCA Teal Theme**: Professional, glassmorphism UI.
- **3D Interactive Badges**: Move your mouse to tilt the card, and click to flip and see the Custom Issuer Visual on the back.
- **AI Event Mode Extraction**: Paste unstructured text, and Deepseek extracts the fields (First/Last name, Dates, Project, Badge Type) automatically.
- **Gasless Minting**: The backend pays the Amoy gas fee so users don't need a wallet or POL to mint!
- **IPFS Storage**: Fully decentralized image and metadata storage via Pinata.
- **Public Gallery**: Automatically fetches and displays recently minted Badges directly from the smart contract.

## 🛠️ Setup Instructions

### 1. Fund the Backend Wallet
The app uses a gasless relayer wallet to pay transaction fees. You provided the private key for `0xB7C6F915d8B7aD5f81Add6f76f778b82de937dB1`.
Currently, this wallet has **0 POL** on the Polygon Amoy Testnet. You must fund it before deploying:
1. Go to [Polygon Faucet](https://faucet.polygon.technology/).
2. Request `Amoy POL` for the address `0xB7C6F915d8B7aD5f81Add6f76f778b82de937dB1`.

### 2. Deploy the Smart Contract
Once your wallet has Amoy POL, deploy the customized `BadgeNFT` contract:
```bash
cd contracts
npx hardhat run scripts/deploy.ts --network amoy
```
*Copy the deployed contract address from the terminal output.*

### 3. Configure the Web App
Open `web/.env.local` and paste the deployed contract address:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_address_here
```
*(Your Private Key, Pinata JWT, and DeepSeek API Key are already securely loaded in this file!)*

### 4. Run the App
```bash
cd web
npm install
npm run dev
```
Navigate to `http://localhost:3000` to play with the Event Mode parser, see the 3D card preview, and Mint your Badge! Click the **Public Gallery** button on the homepage to see the live feed of all badges deployed from this contract.
