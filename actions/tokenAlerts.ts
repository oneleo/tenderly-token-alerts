import {
  ActionFn,
  Context,
  Event,
  TransactionEvent,
  Storage,
} from "@tenderly/actions";
import { getAddress, JsonRpcProvider } from "ethers";

import {
  ChainId,
  getTransactionUrl,
  getRpcUrl,
  ERC20,
  getNetworkName,
  getAddressUrl,
  sendSlackNotification,
  getTokenUrl,
} from "./util";
import type { TokenThresholdConfig } from "./util";

const NATIVE_TOKEN_ADDRESS = getAddress(
  `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`
);

// Secret keys
const SLACK_WEBHOOK_KEY = `SLACK_WEBHOOK`;
const ALCHEMY_API_KEY = `ALCHEMY_API_KEY`;

// Storage Keys
const TOKEN_THRESHOLD_KEY = `TOKEN_THRESHOLD`;
const HEART_BEAT_COUNTER_KEY = `HEART_BEAT_COUNTER`;

export const tokenAlertsFn: ActionFn = async (
  context: Context,
  event: Event
) => {
  // Cast event to TransactionEvent type
  const transactionEvent = event as TransactionEvent;
  if (transactionEvent.hash === undefined) {
    return;
  }

  const chainId = parseInt(transactionEvent.network);
  if (!Object.values(ChainId).includes(chainId)) {
    console.error(`Unsupported chain id: ${chainId}`);
    return;
  }

  const transactionHash = transactionEvent.hash;
  console.log(`Transaction: ${getTransactionUrl(chainId, transactionHash)}`);

  const transactionFrom = transactionEvent.from;
  console.log(`Transaction from address: ${transactionFrom}`);

  const slackWebhook: string = await context.secrets.get(SLACK_WEBHOOK_KEY);

  // Check and notify heartbeat
  await checkAndNotifyHeartBeat(context.storage, slackWebhook);

  const alchemyApiKey: string = await context.secrets.get(ALCHEMY_API_KEY);
  if (!alchemyApiKey) {
    console.error(`Alchemy api key not found`);
    return;
  }

  const tokenThresholdConfig: TokenThresholdConfig =
    await context.storage.getJson(TOKEN_THRESHOLD_KEY);
  console.log(
    `Token threshold config: ${JSON.stringify(tokenThresholdConfig)}`
  );

  const rpcUrl = getRpcUrl(chainId, alchemyApiKey);
  if (!rpcUrl) {
    console.error(`Unsupported chainId: ${chainId}`);
    return;
  }

  const provider = new JsonRpcProvider(rpcUrl);

  for (const cId in tokenThresholdConfig) {
    if (parseInt(cId) !== chainId) {
      continue;
    }
    const chain = tokenThresholdConfig[cId];

    for (const address in chain) {
      const data = chain[address];
      const label = data.label;
      const docUrl = data.docUrl;
      const contacts = data.contacts;
      const formattedContacts = contacts.reduce((acc, contact, index) => {
        return acc + `\t${index + 1}. ${contact.name}: <@${contact.slackId}>\n`;
      }, ``);

      console.log(
        `Chain ID: ${cId}, Address: ${address}, Label: ${label}, Document: ${docUrl}`
      );

      for (const tokenAddress in data.monitorTokens) {
        const monitorToken = data.monitorTokens[tokenAddress];
        const tAddress = getAddress(tokenAddress);
        const tThreshold = monitorToken.threshold;
        console.log(
          `Token Address: ${tAddress}, Threshold: ${tThreshold}, Description: ${monitorToken.description}`
        );

        if (tAddress === NATIVE_TOKEN_ADDRESS) {
          const nativeTokenBalance = await provider.getBalance(transactionFrom);
          const formatedNativeTokenBalance = ERC20.formatAmount(
            nativeTokenBalance,
            18
          );

          console.log(
            `Native token - Address: ${tAddress}, Balance: ${formatedNativeTokenBalance}, Threshold: ${tThreshold}`
          );

          await alertEthBalanceBelowThreshold(
            chainId,
            transactionHash,
            transactionFrom,
            formatedNativeTokenBalance,
            tThreshold,
            slackWebhook,
            label,
            docUrl,
            formattedContacts
          );
        }

        if (tAddress !== NATIVE_TOKEN_ADDRESS) {
          const erc20 = ERC20.init(tAddress, provider);
          const erc20TokenBalance = await erc20.balanceOf(transactionFrom);
          const formatedErc20TokenBalance = await erc20.formatAmount(
            erc20TokenBalance
          );
          const tSymbol = await erc20.symbol();

          console.log(
            `${tSymbol} - Address: ${tAddress}, Balance: ${formatedErc20TokenBalance}, Threshold: ${tThreshold}`
          );

          await alertTokenBalanceBelowThreshold(
            chainId,
            transactionHash,
            transactionFrom,
            tSymbol,
            tAddress,
            formatedErc20TokenBalance,
            tThreshold,
            slackWebhook,
            label,
            docUrl,
            formattedContacts
          );
        }
      }
    }
  }
};

const checkAndNotifyHeartBeat = async (
  storage: Storage,
  webhookUrl: string
) => {
  let heartBeatCounter = await storage.getNumber(HEART_BEAT_COUNTER_KEY);

  if (!heartBeatCounter) {
    await storage.putNumber(HEART_BEAT_COUNTER_KEY, 1);
    console.log("Initialized heartBeatCounter: 1");
    return;
  }

  heartBeatCounter += 1;
  await storage.putNumber(HEART_BEAT_COUNTER_KEY, heartBeatCounter);
  console.log(`heartBeatCounter: ${heartBeatCounter}`);

  if (heartBeatCounter % 100 !== 0) {
    return;
  }

  const title = `*_Tenderly Token Alerts - System Heartbeat 💓_*`;
  const message = `Tenderly Token Alerts has executed ${heartBeatCounter} cycles. Web3 Actions are operating as expected.`;

  console.log(`title & text: ${title}\n${message}`);
  await sendSlackNotification(title, message, webhookUrl);
};

const alertEthBalanceBelowThreshold = async (
  chainId: number,
  transactionHash: string,
  accountAddress: string,
  balance: number,
  threshold: number,
  webhookUrl: string,
  label: string,
  docUrl: string,
  contacts: string
) => {
  if (balance > threshold) {
    return;
  }
  const networkName = getNetworkName(chainId);
  const accountUrl = getAddressUrl(chainId, accountAddress);
  const transactionUrl = getTransactionUrl(chainId, transactionHash);
  const title = `*_(${label}) Native Token Balance Below Threshold Alert ⚠️_*`;

  const message = `*[Description]*\n\tThe native token balance (e.g., ETH, POL, BNB) for ${label} on ${networkName} is <${accountUrl}|${balance}> (below threshold of ${threshold}).\n*[Impact]*\n\tLow balance may lead to transaction failures or delays in ${label}.\n*[Action Needed]*\n\t1. Check ${label}'s native token balance.\n\t2. Investigate recent withdrawals.\n\t3. Replenish native token if necessary.\n*[Details]*\n\t1. ${label}: <${accountUrl}|${accountAddress}>.\n\t2. Guide: <${docUrl}|${label} document>.\n*[Contact]*\n${contacts}*[Triggered by]*\n\tTransaction: <${transactionUrl}|${transactionHash}>.`;

  console.error(`title & text: ${title}\n${message}`);
  await sendSlackNotification(title, message, webhookUrl);
};

const alertTokenBalanceBelowThreshold = async (
  chainId: number,
  transactionHash: string,
  accountAddress: string,
  tokenSymbol: string,
  tokenAddress: string,
  balance: number,
  threshold: number,
  webhookUrl: string,
  label: string,
  docUrl: string,
  contacts: string
) => {
  if (balance > threshold) {
    return;
  }
  const networkName = getNetworkName(chainId);
  const accountUrl = getAddressUrl(chainId, accountAddress);
  const transactionUrl = getTransactionUrl(chainId, transactionHash);
  const balanceUrl = getTokenUrl(chainId, accountAddress, tokenAddress);
  const title = `*_(${label}) ${tokenSymbol} Balance Below Threshold Alert ⚠️_*`;

  const message = `*[Description]*\n\tThe ${tokenSymbol} balance for ${label} on ${networkName} is <${balanceUrl}|${balance}> (below threshold of ${threshold}).\n*[Impact]*\n\tLow balance may lead to transaction failures or delays in ${label}.\n*[Action Needed]*\n\t1. Check ${label}'s ${tokenSymbol} balance.\n\t2. Investigate recent withdrawals.\n\t3. Replenish ${tokenSymbol} if necessary.\n*[Details]*\n\t1. ${label}: <${accountUrl}|${accountAddress}>.\n\t2. Guide: <${docUrl}|${label} document>.\n*[Contact]*\n${contacts}*[Triggered by]*\n\tTransaction: <${transactionUrl}|${transactionHash}>.`;

  console.error(`title & text: ${title}\n${message}`);
  await sendSlackNotification(title, message, webhookUrl);
};
