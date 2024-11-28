require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const { ethers } = require("ethers");
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_PROVIDER_URL);

let groupSettings = {};
let payments = {};
let trendingTokens = {};

bot.start((ctx) => {
  const chatId = ctx.chat.id;
  if (!groupSettings[chatId]) {
    groupSettings[chatId] = {
      tokenAddress: null,
      threshold: 0,
      customMessage: "",
      adsEnabled: true,
    };
  }
  ctx.reply(
    "👋 Welcome! Set up your group with the following options:",
    Markup.inlineKeyboard([
      [Markup.button.callback("🔗 Set Token", "set_token")],
      [Markup.button.callback("📏 Set Threshold", "set_threshold")],
      [Markup.button.callback("💬 Set Message", "set_message")],
      [Markup.button.callback("🚫 Remove Ads", "remove_ads")],
      [Markup.button.callback("📣 Advertise", "advertise")],
    ])
  );
});

bot.command("set_token", (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) return ctx.reply("Usage: /set_token <token_address>");

  const tokenAddress = args[1];
  const chatId = ctx.chat.id;

  if (ethers.utils.isAddress(tokenAddress)) {
    groupSettings[chatId].tokenAddress = tokenAddress;
    startMonitoring(chatId);
    ctx.reply(`Token address set to ${tokenAddress}`);
  } else {
    ctx.reply("Invalid Ethereum address.");
  }
});

bot.command("set_threshold", (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) return ctx.reply("Usage: /set_threshold <amount>");

  const threshold = parseFloat(args[1]);
  const chatId = ctx.chat.id;

  if (!isNaN(threshold) && threshold > 0) {
    groupSettings[chatId].threshold = threshold;
    ctx.reply(`Threshold set to ${threshold}`);
  } else {
    ctx.reply("Please enter a valid number for the threshold.");
  }
});

bot.command("set_message", (ctx) => {
  const chatId = ctx.chat.id;
  const customMessage = ctx.message.text.split(" ").slice(1).join(" ");
  if (customMessage) {
    groupSettings[chatId].customMessage = customMessage;
    ctx.reply("Custom message set.");
  } else {
    ctx.reply("Please provide a message.");
  }
});

bot.action("set_token", (ctx) =>
  ctx.reply("🔗 Enter the token address using: /set_token <address>")
);

bot.action("set_threshold", (ctx) =>
  ctx.reply("📏 Enter the threshold amount using: /set_threshold <amount>")
);

bot.action("set_message", (ctx) =>
  ctx.reply("💬 Enter the custom message using: /set_message <your_message>")
);

bot.action("remove_ads", (ctx) =>
  ctx.reply("🚫 Ad removal feature is not implemented yet.")
);

bot.action("advertise", (ctx) =>
  ctx.reply("📣 To advertise, send payment to ... (not implemented).")
);

async function startMonitoring(chatId) {
  const { tokenAddress, threshold } = groupSettings[chatId];
  if (!tokenAddress || threshold <= 0) return;

  provider.on("pending", async (txHash) => {
    try {
      const tx = await provider.getTransaction(txHash);
      if (tx) {
        await processIncomingPayment(tx);
        if (tx.to === tokenAddress) {
          const value = ethers.utils.formatEther(tx.value);
          if (value >= threshold) {
            displayBuyMessage(chatId, value, tokenAddress);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
    }
  });
}

function formatTrendingMessage() {
  return Object.keys(trendingTokens).length > 0
    ? `\nTrending: ${Object.keys(trendingTokens).join(", ")}`
    : "\nNo current trends.";
}

function displayBuyMessage(chatId, value, tokenAddress) {
  let message = `Buy detected: ${value} ETH`;

  if (groupSettings[chatId].customMessage) {
    message += `\n${groupSettings[chatId].customMessage}`;
  }

  if (value >= groupSettings[chatId].threshold * 10) {
    message += " 🐋 Whale detected!";
  }

  if (groupSettings[chatId].adsEnabled) {
    message += "\nAdvertisement: Your ad here!";
  }

  message += formatTrendingMessage();

  bot.telegram.sendMessage(chatId, message);
}

async function processIncomingPayment(tx) {
  const myWalletAddress = process.env.MY_WALLET_ADDRESS;
  if (tx.to === myWalletAddress) {
    const value = ethers.utils.formatEther(tx.value);
    if (value >= 1) {
      const tokenAddress = determineTokenBasedOnTx(tx);
      trendingTokens[tokenAddress] = true;
    }
    // Implement logic for advertisements and ad removals here based on payment
  }
}

function determineTokenBasedOnTx(tx) {
  // Implement logic to determine which token payment relates to
  // For demonstration, let's assume you parse it somehow:
  return "exampleTokenAddress";
}

bot.launch();
console.log("Bot is running");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
