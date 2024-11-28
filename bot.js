require("dotenv").config();
const { Telegraf } = require("telegraf");
const { ethers } = require("ethers");
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_PROVIDER_URL);

// Placeholder for storing group-specific settings and payments
let groupSettings = {};
let payments = {};

// Command to start setup
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
    "Welcome! Use /set_token, /set_threshold, and /set_message to begin."
  );
});

// Set token address
bot.command("set_token", (ctx) => {
  const args = ctx.message.text.split(" ");
  if (args.length < 2) return ctx.reply("Usage: /set_token <token_address>");

  const tokenAddress = args[1];
  const chatId = ctx.chat.id;

  if (ethers.utils.isAddress(tokenAddress)) {
    groupSettings[chatId].tokenAddress = tokenAddress;
    startMonitoring(chatId); // Start monitoring when token is set
    ctx.reply(`Token address set to ${tokenAddress}`);
  } else {
    ctx.reply("Invalid Ethereum address.");
  }
});

// Set amount threshold
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

// Set custom message
bot.command("set_message", (ctx) => {
  const chatId = ctx.chat.id;
  const customMessage = ctx.message.text.split(" ").slice(1).join(" ");

  if (customMessage) {
    groupSettings[chatId].customMessage = customMessage;
    ctx.reply(`Custom message set.`);
  } else {
    ctx.reply("Please provide a message.");
  }
});

// Ad and payment commands (placeholders)
bot.command("remove_ads", (ctx) => {
  const chatId = ctx.chat.id;
  // Placeholder: Adjust payment logic to disable ads
  ctx.reply("Ad removal feature is not implemented. Add logic here.");
});

bot.command("advertise", (ctx) => {
  const chatId = ctx.chat.id;
  // Placeholder: Provide payment address and process logic
  ctx.reply("To advertise, send payment to ... (not implemented).");
});

// Start monitoring for transactions
async function startMonitoring(chatId) {
  const { tokenAddress, threshold } = groupSettings[chatId];
  if (!tokenAddress || threshold <= 0) return;

  provider.on("pending", async (txHash) => {
    try {
      const tx = await provider.getTransaction(txHash);
      if (tx && tx.to === tokenAddress) {
        const value = ethers.utils.formatEther(tx.value);
        if (value >= threshold) {
          let message = `Buy detected: ${value} ETH`;

          if (groupSettings[chatId].customMessage) {
            message += `\n${groupSettings[chatId].customMessage}`;
          }

          if (value >= threshold * 10) {
            message += " 🐋 Whale detected!";
          }

          if (groupSettings[chatId].adsEnabled) {
            message += "\nAdvertisement: Your ad here!";
          }

          bot.telegram.sendMessage(chatId, message);
        }
      }
    } catch (error) {
      console.error("Error fetching transaction:", error);
    }
  });
}

// Launch bot
bot.launch();
console.log("Bot is running");

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
