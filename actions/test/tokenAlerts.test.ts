import { TestRuntime } from "@tenderly/actions-test";
import { expect } from "chai";
import { config } from "dotenv";

import { tokenAlertsFn } from "../tokenAlerts";
import { transferUsdcPayload, callClaimPayload } from "./payload";
import type { TokenThresholdConfig } from "../util";

const slackWebhookKey = `SLACK_WEBHOOK`;
const heartBeatCounterKey = `HEART_BEAT_COUNTER`;
const alchemyApiKeyKey = `ALCHEMY_API_KEY`;
const tokenThresholdKey = `TOKEN_THRESHOLD`;

describe("CRT Tenderly Web3 Actions", () => {
  let slackWebhook: string;
  let alchemyApiKey: string;
  let tokenThresholdConfig: TokenThresholdConfig;

  const crossRollupTransferRelayerAddress = `0xFf32609a2Ee397857841C46d96Edb85F0Ac64d61`;
  const claimableLinkContractSigner = `0x23Bc2B107C7C7C04F2bA1d345376145adAdDFA35`;

  const nativeTokenAddress = `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE`;
  const optimismUsdcTokenAddress = `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85`;

  beforeEach(() => {
    config();
    slackWebhook = process.env.SLACK_WEBHOOK || ``;
    if (!slackWebhook) {
      console.warn("SLACK_WEBHOOK environment variable is missing");
    }

    alchemyApiKey = process.env.ALCHEMY_API_KEY || ``;
    if (!alchemyApiKey) {
      console.warn("ALCHEMY_API_KEY environment variable is missing");
    }

    tokenThresholdConfig = {
      "10": {
        [crossRollupTransferRelayerAddress]: {
          label: "Cross-rollup Transfer Relayer",
          docUrl: `https://imtoken.atlassian.net/wiki/spaces/IL/pages/1783398435`,
          contacts: [
            { name: "Irara", slackId: "U03HEAQL36X" },
            { name: "Alfred", slackId: "U040T88AV62" },
          ],
          monitorTokens: {
            [nativeTokenAddress]: {
              threshold: 0.0025,
              description: "ETH - Ethereum (18 decimals)",
            },
            [optimismUsdcTokenAddress]: {
              threshold: 5.5,
              description: "USDC - USD Coin (6 decimals)",
            },
          },
        },
      },
      "42161": {
        [claimableLinkContractSigner]: {
          label: "ClaimableLink contract signer",
          docUrl: `https://imtoken.atlassian.net/wiki/spaces/IL/pages/1726251562`,
          contacts: [{ name: "David", slackId: "U03T5DFP1F1" }],
          monitorTokens: {
            [nativeTokenAddress]: {
              threshold: 0.0025,
              description: "ETH - Ethereum (18 decimals)",
            },
          },
        },
      },
    };
  });

  it("Should initial heartbeat", async () => {
    const testRuntime = new TestRuntime();

    testRuntime.context.secrets.put(slackWebhookKey, slackWebhook);
    testRuntime.context.secrets.put(alchemyApiKeyKey, alchemyApiKey);
    await testRuntime.context.storage.putJson(
      tokenThresholdKey,
      tokenThresholdConfig
    );

    await testRuntime.execute(tokenAlertsFn, transferUsdcPayload);

    const heartBeatCounter = await testRuntime.context.storage.getNumber(
      heartBeatCounterKey
    );
    expect(heartBeatCounter).to.eq(1);
  });

  it("Should notify Slack for heartbeat check", async () => {
    const testRuntime = new TestRuntime();

    testRuntime.context.secrets.put(slackWebhookKey, slackWebhook);
    await testRuntime.context.storage.putNumber(heartBeatCounterKey, 199);
    testRuntime.context.secrets.put(alchemyApiKeyKey, alchemyApiKey);
    await testRuntime.context.storage.putJson(
      tokenThresholdKey,
      tokenThresholdConfig
    );

    await testRuntime.execute(tokenAlertsFn, transferUsdcPayload);

    const heartBeatCounter = await testRuntime.context.storage.getNumber(
      heartBeatCounterKey
    );
    expect(heartBeatCounter).to.eq(200);
  });

  it("Should notify Slack for threshold alert on Optimism", async () => {
    const testRuntime = new TestRuntime();

    testRuntime.context.secrets.put(slackWebhookKey, slackWebhook);
    await testRuntime.context.storage.putNumber(heartBeatCounterKey, 1);
    testRuntime.context.secrets.put(alchemyApiKeyKey, alchemyApiKey);

    tokenThresholdConfig[`10`][crossRollupTransferRelayerAddress].monitorTokens[
      nativeTokenAddress
    ].threshold = 100;

    tokenThresholdConfig[`10`][crossRollupTransferRelayerAddress].monitorTokens[
      optimismUsdcTokenAddress
    ].threshold = 100;

    // Do not trigger an alert here, as transferUsdcPayload is on Optimism
    tokenThresholdConfig[`42161`][claimableLinkContractSigner].monitorTokens[
      nativeTokenAddress
    ].threshold = 100;
    await testRuntime.context.storage.putJson(
      tokenThresholdKey,
      tokenThresholdConfig
    );

    await testRuntime.execute(tokenAlertsFn, transferUsdcPayload);
  });

  it("Should notify Slack for threshold alert on Arbitrum", async () => {
    const testRuntime = new TestRuntime();

    testRuntime.context.secrets.put(slackWebhookKey, slackWebhook);
    await testRuntime.context.storage.putNumber(heartBeatCounterKey, 1);
    testRuntime.context.secrets.put(alchemyApiKeyKey, alchemyApiKey);

    // Do not trigger an alert here, as callClaimPayload is on Arbitrum
    tokenThresholdConfig[`10`][crossRollupTransferRelayerAddress].monitorTokens[
      nativeTokenAddress
    ].threshold = 100;

    // Do not trigger an alert here, as callClaimPayload is on Arbitrum
    tokenThresholdConfig[`10`][crossRollupTransferRelayerAddress].monitorTokens[
      optimismUsdcTokenAddress
    ].threshold = 100;

    tokenThresholdConfig[`42161`][claimableLinkContractSigner].monitorTokens[
      nativeTokenAddress
    ].threshold = 100;
    await testRuntime.context.storage.putJson(
      tokenThresholdKey,
      tokenThresholdConfig
    );

    await testRuntime.execute(tokenAlertsFn, callClaimPayload);
  });
});
