# tenderly-token-alerts

A Tenderly Web3 Actions project for monitoring token balances across multiple addresses against defined thresholds.

## Prerequisites

Before deploying this action, ensure you have the following setup:

1. **Tenderly Account & Project**

   - Create an account on [Tenderly](https://dashboard.tenderly.co/) and set up a new project.

2. **Slack WebHook for Messages**

   - Obtain a WebHook URL from the [Slack API](https://api.slack.com/apps) or the [legacy version](https://my.slack.com/services/new/incoming-webhook).

3. **Configure Secrets in Tenderly**
   - In Tenderly’s Web3 Actions, add a secret named `SLACK_WEBHOOK` and set its value to the WebHook URL.
4. **Alchemy API Key**

   - Create an API key at [Alchemy Dashboard](https://dashboard.alchemy.com/apps).
   - Store the API key in Tenderly Web3 Secrets under the variable `ALCHEMY_API_KEY`.

5. **Define Token Threshold Storage**

   - Add a storage entry `TOKEN_THRESHOLD` as a JSON string, for example:

   ```json
   {
     "10": {
       "0xFf32609a2Ee397857841C46d96Edb85F0Ac64d61": {
         "label": "Cross-rollup Transfer Relayer",
         "docUrl": "https://imtoken.atlassian.net/wiki/spaces/IL/pages/1783398435",
         "contacts": [
           { "name": "Irara", "slackId": "U03HEAQL36X" },
           { "name": "Alfred", "slackId": "U040T88AV62" }
         ],
         "monitorTokens": {
           "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": {
             "threshold": 0.0025,
             "description": "ETH - Ethereum (18 decimals)"
           },
           "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85": {
             "threshold": 5.5,
             "description": "USDC - USD Coin (6 decimals)"
           }
         }
       }
     },
     "42161": {
       "0x23Bc2B107C7C7C04F2bA1d345376145adAdDFA35": {
         "label": "ClaimableLink contract signer",
         "docUrl": "https://imtoken.atlassian.net/wiki/spaces/IL/pages/1726251562",
         "contacts": [{ "name": "David", "slackId": "U03T5DFP1F1" }],
         "monitorTokens": {
           "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE": {
             "threshold": 0.0025,
             "description": "ETH - Ethereum (18 decimals)"
           }
         }
       }
     }
   }
   ```

6. **Install Tenderly CLI**

   - Install the Tenderly CLI on your local machine:

   ```shell
   brew tap tenderly/tenderly && brew install tenderly
   ```

## Deployment

### 1. Clone the Repository

```shell
# Clone the project
git clone https://github.com/oneleo/tenderly-token-alerts.git
cd tenderly-token-alerts/
```

### 2. Configure Tenderly Project

- Set your Tenderly account and project name in `tenderly.yaml` using the format: `[account_id]/[project_slug]`.
- Example: If the account is `cook` and the project name is `tenderly-token-alerts`, modify `tenderly.yaml` as follows:

```yaml
# ...
actions:
  cook/tenderly-token-alerts:
# ...
```

### 3. Authenticate and Deploy

```shell
# Login to Tenderly (obtain a token from https://dashboard.tenderly.co/account/authorization)
tenderly login --force

# Build the Action project
tenderly actions build

# Deploy the Action to Tenderly Web3 Actions
tenderly actions deploy
```

## Monitoring

- The `actions/tokenAlerts.ts` script monitors the CRT relayer's token balances.
- If a token balance falls below the defined threshold, an alert is sent to the configured Slack channel.

---

This guide ensures a smooth setup and deployment process for monitoring cross-rollup transfers using Tenderly Web3 Actions.
