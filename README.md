# EDI Challenge 2026: Identity & Badging Platform

A full-stack, enterprise-grade digital badge issuing platform developed for the ELCA EDI Challenge 2026. This platform enables the secure, gasless generation and distribution of non-fungible token (NFT) badges anchored on the Polygon blockchain.

## System Architecture

The repository is structured as a monorepo containing two primary deployment environments:

1. **Contracts (`/contracts`)**
   - Solidity smart contracts (`BadgeNFT.sol`) defining the ERC-721 token mechanics.
   - Hardhat deployment pipeline for compiling and deploying to EVM-compatible networks.
   - Configured for both Polygon Amoy (Testnet) and Polygon Mainnet (Production) routing.

2. **Web Application (`/web`)**
   - Next.js frontend built with React and Tailwind CSS, featuring an interactive 3D Canvas integration.
   - Serverless backend API (`/api/mint`, `/api/upload`) configured to broker transactions utilizing a gasless relayer wallet.
   - Integrated with Pinata for decentralized IPFS metadata and image hosting.
   - Multi-chain toggle functionality supporting dynamic RPC routing based on the target deployment environment.

## Deployment Instructions

### Smart Contract Initialization

1. Navigate to the `contracts` directory:
   ```bash
   cd contracts
   npm install
   ```
2. Set the `PRIVATE_KEY` deployment variable in `contracts/.env`.
3. Deploy to the desired network:
   ```bash
   npx hardhat run scripts/deploy.ts --network polygon
   ```

### Web Client

1. Navigate to the `web` directory:
   ```bash
   cd web
   npm install
   ```
2. Populate `web/.env.local` with your deployment credentials:
   - `NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS`
   - `PRIVATE_KEY`
   - `PINATA_JWT`
3. Launch the development server:
   ```bash
   npm run dev
   ```

The application will be accessible at `http://localhost:3000`.
