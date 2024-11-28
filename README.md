# 🎩 Safeguard and BobbyBuy Bot

Welcome to the Safeguard and BobbyBuy Bot – the ultimate Telegram companion for monitoring Ethereum transactions! This bot empowers your Telegram groups with real-time insights into token activity, delivering notifications on major buys that are tailor-made for your community.

## 🌟 Features

- **🔗 Token Tracking**: Monitor specific ERC20 tokens effortlessly.
- **📈 Threshold Alerts**: Get notified when transactions exceed your set threshold – never miss a whale buy again!
- **💬 Customizable Messages**: Personalize the alerts to fit the tone and vibe of your group.
- **🔥 Trending Tokens**: Stay ahead with updates on what's trending in the crypto world.
- **🚀 Advertisement & Monetization (Coming Soon)**: Potential to monetize by integrating ads into your bot notifications.

## ⚡ Quick Start

### Prerequisites

- Node.js and npm installed on your machine.
- Access to the Ethereum blockchain (via Infura, Alchemy, etc.).

### Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd safeguard-bobbybuy-bot

   ```

2. **Install dependencies:**

   ```bash
   npm install

   ```

3. **Environment Configuration:**

- Create a .env file in the root directory and configure:

  ```bash
  TELEGRAM_BOT_TOKEN=<your_telegram_bot_token>
  ETHEREUM_PROVIDER_URL=<your_ethereum_provider_url>
  MY_WALLET_ADDRESS=<your_wallet_address>
  ```

4. **Launch the Bot:**

   ```bash
   npm start

   ```

### 🛠 Bot Commands

/start: Initializes and guides you through setting up.

/set_token <token_address>: Define the token address to watch.

/set_threshold <amount>: Specify the amount threshold for alerts.

/set_message <custom_message>: Craft your unique message for alerts.

### 🖱 Interactive Menu

🔗 Set Token: Quick setup guide to choose your token.

📏 Set Threshold: Define your alert threshold.

💬 Set Message: Customize your notification message.

🚫 Remove Ads: Currently not functional – stay tuned for updates.

📣 Advertise: Placeholder for future ad functionalities.

### 🧠 How It Works

Transaction Monitoring: The bot taps into the Ethereum network to keep a close eye on transactions involving your selected token.

Intelligent Alerts: When a significant transaction is detected, the bot sends an alert to your group.

Trending Insights: Highlights emerging tokens based on high-value transactions.

### 🤝 Contributing

We welcome contributions! Feel free to fork the repo, make modifications, and send us a pull request with your improvements.

### 📜 License

Distributed under the MIT License. See LICENSE for more information.
