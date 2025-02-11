
![EverionMain](https://github.com/user-attachments/assets/3b174559-60e6-4ca0-b629-37d8f49e1d1e)

## Everion-AI

AI-powered agent integrated with the SUI ecosystem. It is capable of analyzing tokens, facilitating chat and discussion and more to come. The SUI integration provides capabilities to log in using a wallet, quickly buy tokens, view your portfolio, and aggregate and analyze insights about particular tokens.

[Website](https://everion.ai/)

### Features

- Token Analysis: Analyze various tokens and get detailed insights.
- Chat and Discussion: Engage in discussions and chat about tokens.
- SUI Integration:
  - Log in using your SUI wallet.
  - Quickly buy tokens.
  - View your portfolio.
- Insights Aggregation: Aggregate and analyze insights about specific tokens from multiple sources.

Everion AI is a real-time crypto data scraper that gives you first-hand insights straight from the source. It collects data from trusted accounts for market insights and from Telegram chats for the degen vibe—offering a clear picture of what's really happening. Designed to fit perfectly within the Sui ecosystem, it provides open-source APIs and modular components that you can easily build on. Whether you're developing trading bots, sentiment tools, or analytics dashboards, Everion AI supplies the fresh, actionable data you need to make smart decisions and drive innovation.

![Scalability](https://github.com/user-attachments/assets/a47a0094-110f-4724-a044-8fd233094b90)

### Getting Started

#### Prerequisites

- Node.js (v23 or later)
- npm
- pnpm (v9+)
- SUI Wallet

# Installation Guide

## Launch Frontend

1. Clone the Git repository to your local machine:

   ```bash
   git clone https://github.com/mintsupst/Everion-AI
   ```

2. Navigate to the project directory:

   ```bash
   cd Everion-AI
   ```

3. Install dependencies:

   ```bash
   npm install --legacy-peer-deps
   ```

4. Build the project:

   ```bash
   npm run build
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

## Run Insights Backend

6. Navigate to the backend directory:

   ```bash
   cd
   ```

7. Set the required environment variables using `flyctl`:

   ```bash
   flyctl secrets set TELEGRAM_API_ID= \
   TELEGRAM_API_HASH= \
   TELEGRAM_PHONE_NUMBER="" \
   SOURCE_CHAT_ID_1= \
   SOURCE_CHAT_ID_2= \
   TARGET_CHANNEL_ID= \
   BLOCKVISION_API_KEY=
   ```

## Install and Build Eliza

(Optiona) Original eliza setup guide is described here: [Quickstart Guide for Eliza](https://elizaos.github.io/eliza/docs/quickstart/).

## Install nvm (Node Version Manager)

1. Install `nvm` by running the following command:

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
   ```

2. Reload your shell configuration:

   ```bash
   source ~/.bashrc
   ```

## Install Node.js

3. Install Node.js version 23:

   ```bash
   nvm install 23
   ```

4. Verify the installation:

   ```bash
   node -v
   ```

   This should output the version of Node.js (e.g., `v23.x.x`).

5. Use Node.js version 23:

   ```bash
   nvm use 23
   ```

## Install npm and pnpm

6. Install `pnpm` globally:

   ```bash
   npm install -g pnpm
   ```

7. Verify the installation:

   ```bash
   pnpm -v
   ```

8. Navigate to the Eliza directory:

   ```bash
   cd eliza
   ```

9. Place the `.env` file in the `eliza/` directory.

10. Install dependencies:

   ```bash
   pnpm install
   ```

11. Build the project:

   ```bash
   pnpm build
   ```

12. Open two terminal windows.

13. In the first terminal, start Eliza with the specified character:

   ```bash
   pnpm start --character="characters/everion.character.json"
   ```

#### Configuration

Update the API configuration in /components/insights-section.tsx if necessary:

```
const API_CONFIG = {
  BASE_URL: "https://everion-fastapi.fly.dev",
  ENDPOINTS: {
    INSIGHTS: "/insights",
    MESSAGE: "http://localhost:3001/44be3a29-323b-0289-9bdd-de0b009180b1/message",
  },
  REFRESH_INTERVAL: 30000, // Adjust as needed
  HEADERS: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
};
```

#### Running the Application

Start the development server:

```
npm run dev
```

Open your browser and navigate to http://localhost:3000 to see the application in action.

### Usage

- Login: Connect your SUI wallet to log in.
- View Insights: View aggregated insights about various tokens.
- Analyze Tokens: Select a token to get detailed analysis and insights.
- Chat: Engage in discussions and chat about tokens.
- Buy Tokens: Quickly buy tokens using your SUI wallet.

### System description

![Everion](https://github.com/user-attachments/assets/a8f04234-6230-438b-877e-404991962c21)


### Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

### License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
