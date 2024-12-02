require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const { ethers } = require("ethers");
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const provider = new ethers.providers.JsonRpcProvider(
  process.env.ETHEREUM_PROVIDER_URL
);

const REMOVE_ADS_COST = 1.0; // Define cost to remove ads in ETH
const ADVERTISEMENT_COST = 0.5; // Define cost to advertise in ETH

let groupSettings = {};
let trendingTokens = {};
let paymentReferenceMapping = {}; // Holds reference -> chat ID mappings

bot.start((ctx) => {
  initializeGroup(ctx.chat.id);
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

function initializeGroup(chatId) {
  if (!groupSettings[chatId]) {
    groupSettings[chatId] = {
      tokenAddress: null,
      threshold: 0,
      customMessage: "",
      adsEnabled: true,
    };
  }
}

async function checkAdmin(ctx) {
  const admins = await ctx.getChatAdministrators();
  return admins.some((admin) => admin.user.id === ctx.from.id);
}

bot.command("set_token", async (ctx) => {
  const chatId = ctx.chat.id;
  initializeGroup(chatId);

  if (!(await checkAdmin(ctx))) {
    return ctx.reply("Only group admins can set the token address.");
  }

  const args = ctx.message.text.split(" ");
  if (args.length < 2) return ctx.reply("Usage: /set_token <token_address>");

  const tokenAddress = args[1];
  if (ethers.utils.isAddress(tokenAddress)) {
    groupSettings[chatId].tokenAddress = tokenAddress;
    startMonitoring(chatId);
    ctx.reply(`Token address set to ${tokenAddress}`);
  } else {
    ctx.reply("Invalid Ethereum address.");
  }
});

bot.command("set_threshold", async (ctx) => {
  const chatId = ctx.chat.id;
  initializeGroup(chatId);

  if (!(await checkAdmin(ctx))) {
    return ctx.reply("Only group admins can set the threshold.");
  }

  const args = ctx.message.text.split(" ");
  if (args.length < 2) return ctx.reply("Usage: /set_threshold <amount>");

  const threshold = parseFloat(args[1]);
  if (!isNaN(threshold) && threshold > 0) {
    groupSettings[chatId].threshold = threshold;
    ctx.reply(`Threshold set to ${threshold}`);
  } else {
    ctx.reply("Please enter a valid number for the threshold.");
  }
});

bot.command("set_message", async (ctx) => {
  const chatId = ctx.chat.id;
  initializeGroup(chatId);

  if (!(await checkAdmin(ctx))) {
    return ctx.reply("Only group admins can set the custom message.");
  }

  const customMessage = ctx.message.text.split(" ").slice(1).join(" ");
  if (customMessage) {
    groupSettings[chatId].customMessage = customMessage;
    ctx.reply("Custom message set.");
  } else {
    ctx.reply("Please provide a message.");
  }
});

bot.command("toggle_ads", async (ctx) => {
  const chatId = ctx.chat.id;
  initializeGroup(chatId);

  if (!(await checkAdmin(ctx))) {
    return ctx.reply("Only group admins can toggle ads.");
  }

  const currentSetting = groupSettings[chatId].adsEnabled;
  groupSettings[chatId].adsEnabled = !currentSetting;
  ctx.reply(
    `Advertisements have been ${!currentSetting ? "enabled" : "disabled"}.`
  );
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
  ctx.reply("🚫 To remove ads, send a payment of 1 ETH to our wallet.")
);
bot.action("advertise", (ctx) =>
  ctx.reply(
    "📣 To advertise, send a payment of 0.5 ETH with your ad details to our wallet."
  )
);

bot.use(async (ctx, next) => {
  if (ctx.message && ctx.message.migrate_to_chat_id) {
    const oldChatId = ctx.message.chat.id;
    const newChatId = ctx.message.migrate_to_chat_id;
    groupSettings[newChatId] = groupSettings[oldChatId];
    delete groupSettings[oldChatId];
    console.log(`Chat ID changed from ${oldChatId} to ${newChatId}`);
  }
  await next();
});

async function startMonitoring(chatId) {
  const { tokenAddress, threshold } = groupSettings[chatId];
  if (!tokenAddress || threshold <= 0) return;

  provider.on("pending", async (txHash) => {
    try {
      const tx = await provider.getTransaction(txHash);
      if (tx && tx.to) {
        const value = parseFloat(ethers.utils.formatEther(tx.value || "0"));
        if (
          tx.to.toLowerCase() === tokenAddress.toLowerCase() &&
          value > threshold
        ) {
          displayBuyMessage(chatId, value, tokenAddress);
        }
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
    }
  });
}

function formatTrendingMessage() {
  if (Object.keys(trendingTokens).length > 0) {
    return `\n🔝 Trending Tokens: ${Object.keys(trendingTokens).join(", ")}`;
  }
  return "\nNo current trends.";
}

function displayBuyMessage(chatId, value, tokenAddress) {
  let message = `Buy detected: ${value} ETH for token ${tokenAddress}`;
  if (groupSettings[chatId].customMessage) {
    message += `\n${groupSettings[chatId].customMessage}`;
  }
  if (value >= groupSettings[chatId].threshold * 10) {
    message += "\n🐋 Whale detected! This is a large transaction!";
  }
  if (groupSettings[chatId].adsEnabled) {
    message += "\n🔔 Advertisement: Check out our premium services!";
  }
  message += formatTrendingMessage();
  bot.telegram.sendMessage(chatId, message);
}

async function processIncomingPayment(tx) {
  const myWalletAddress = process.env.MY_WALLET_ADDRESS;
  if (tx.to && tx.to.toLowerCase() === myWalletAddress.toLowerCase()) {
    const value = parseFloat(ethers.utils.formatEther(tx.value || "0"));
    if (value >= REMOVE_ADS_COST) {
      const chatId = determineChatIdFromTx(tx);
      if (chatId) {
        groupSettings[chatId].adsEnabled = false;
        bot.telegram.sendMessage(
          chatId,
          "Ads have been removed from this group!"
        );
      }
    }
    if (value >= 1) {
      const tokenAddress = determineTokenBasedOnTx(tx);
      if (tokenAddress) {
        trendingTokens[tokenAddress] = true;
        console.log(`Token ${tokenAddress} marked as trending due to payment.`);
      }
    }
  }
}

function determineChatIdFromTx(tx) {
  // Assumes tx.data contains a reference, this is a placeholder logic
  const reference = tx.data;
  return paymentReferenceMapping[reference] || null;
}

function determineTokenBasedOnTx(tx) {
  const expectedLength = 42;
  if (tx.data && tx.data.length >= expectedLength) {
    const tokenAddress = tx.data.substring(0, expectedLength);
    if (ethers.utils.isAddress(tokenAddress)) {
      return tokenAddress;
    }
  }
  return null;
}

bot.launch();
console.log("Bot is running");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
