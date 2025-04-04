import {
  toBeHex,
  Contract,
  ContractRunner,
  toNumber,
  parseUnits,
  formatUnits,
} from "ethers";

export enum ChainId {
  // Mainnet
  Mainnet = 1,
  Optimism = 10,
  Arbitrum = 42161,
  Base = 8453,
  // Testnet
  Sepolia = 11155111,
  OptimismSepolia = 11155420,
  ArbitrumSepolia = 421614,
  BaseSepolia = 84532,
}

export type MonitorToken = {
  threshold: number;
  description: string;
};

export type Contact = {
  name: string;
  slackId: string;
};

export type TokenThresholdConfig = {
  [chainId: string]: {
    [address: string]: {
      label: string;
      docUrl: string;
      contacts: Contact[];
      monitorTokens: {
        [tokenAddress: string]: MonitorToken;
      };
    };
  };
};

// Logs JSON data, converting BigInt to string
export const jsonStringify = (data: any): string => {
  return JSON.stringify(
    data,
    (_, value) => {
      return typeof value === "bigint" ? toBeHex(value) : value;
    },
    2
  );
};

// Converts a bigint to a floating-point number based on the given decimals
export const bigintToDecimal = (
  bigintValue: bigint,
  decimals: number
): number => {
  const divisor = BigInt(10 ** decimals);
  const integerPart = bigintValue / divisor;
  const remainderPart = bigintValue % divisor;
  const floatPart = Number(remainderPart) / Number(divisor);
  return Number(integerPart) + floatPart;
};

// Sends a notification to a Slack webhook
export const sendSlackNotification = async (
  title: string,
  message: string,
  webhookUrl: string
): Promise<void> => {
  if (!webhookUrl) {
    console.error("Slack webhook URL is missing.");
    return;
  }

  const payload = {
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: title } },
      { type: "section", text: { type: "mrkdwn", text: message } },
    ],
  };

  try {
    console.log(`📢 Sending Slack notification: "${title}"`);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Slack API responded with status: ${response.status} - ${response.statusText}`
      );
    }

    console.log("✅ Slack notification sent successfully.");
  } catch (error) {
    console.error(`❌ Failed to send Slack notification: ${error}`);
  }
};

// Gets RPC URL based on chain ID and API key
export const getRpcUrl = (
  chainId: number,
  alchemyApiKey: string
): string | null => {
  const baseUrls: Record<number, string> = {
    // Mainnet
    [ChainId.Mainnet]: `https://eth-mainnet.g.alchemy.com/v2/`,
    [ChainId.Optimism]: `https://opt-mainnet.g.alchemy.com/v2/`,
    [ChainId.Arbitrum]: `https://arb-mainnet.g.alchemy.com/v2/`,
    [ChainId.Base]: `https://base-mainnet.g.alchemy.com/v2/`,
    // Testnet
    [ChainId.Sepolia]: `https://eth-sepolia.g.alchemy.com/v2/`,
    [ChainId.OptimismSepolia]: `https://opt-sepolia.g.alchemy.com/v2/`,
    [ChainId.ArbitrumSepolia]: `https://arb-sepolia.g.alchemy.com/v2/`,
    [ChainId.BaseSepolia]: `https://base-sepolia.g.alchemy.com/v2/`,
  };
  return baseUrls[chainId] ? `${baseUrls[chainId]}${alchemyApiKey}` : null;
};

// Gets network name based on chain ID
export const getNetworkName = (chainId: number): string => {
  const baseNames: Record<number, string> = {
    // Mainnet
    [ChainId.Mainnet]: `Mainnet`,
    [ChainId.Optimism]: `Optimism`,
    [ChainId.Arbitrum]: `Arbitrum One`,
    [ChainId.Base]: `Base`,
    // Testnet
    [ChainId.Sepolia]: `Sepolia Testnet`,
    [ChainId.OptimismSepolia]: `Optimism Sepolia Testnet`,
    [ChainId.ArbitrumSepolia]: `Arbitrum Sepolia Testnet`,
    [ChainId.BaseSepolia]: `Base Sepolia Testnet`,
  };
  return baseNames[chainId] ? `${baseNames[chainId]}` : `unknown`;
};

// Gets transaction scan URL for a given chain ID and transaction hash
export const getTransactionUrl = (
  chainId: number,
  transactionHash: string
): string | null => {
  const baseUrls: Record<number, string> = {
    // Mainnet
    [ChainId.Mainnet]: `https://etherscan.io/tx/`,
    [ChainId.Optimism]: `https://optimistic.etherscan.io/tx/`,
    [ChainId.Arbitrum]: `https://arbiscan.io/tx/`,
    [ChainId.Base]: `https://basescan.org/tx/`,
    // Testnet
    [ChainId.Sepolia]: `https://sepolia.etherscan.io/tx/`,
    [ChainId.OptimismSepolia]: `https://sepolia-optimism.etherscan.io/tx/`,
    [ChainId.ArbitrumSepolia]: `https://sepolia.arbiscan.io/tx/`,
    [ChainId.BaseSepolia]: `https://sepolia.basescan.org/tx/`,
  };
  return baseUrls[chainId]
    ? `${baseUrls[chainId]}${transactionHash}#eventlog`
    : null;
};

// Gets writeContract scan URL for a given chain ID and address
export const getAddressUrl = (
  chainId: number,
  address: string
): string | null => {
  const baseUrls: Record<number, string> = {
    // Mainnet
    [ChainId.Mainnet]: `https://etherscan.io/address/`,
    [ChainId.Optimism]: `https://optimistic.etherscan.io/address/`,
    [ChainId.Arbitrum]: `https://arbiscan.io/address/`,
    [ChainId.Base]: `https://basescan.org/address/`,
    // Testnet
    [ChainId.Sepolia]: `https://sepolia.etherscan.io/address/`,
    [ChainId.OptimismSepolia]: `https://sepolia-optimism.etherscan.io/address/`,
    [ChainId.ArbitrumSepolia]: `https://sepolia.arbiscan.io/address/`,
    [ChainId.BaseSepolia]: `https://sepolia.basescan.org/address/`,
  };
  return baseUrls[chainId] ? `${baseUrls[chainId]}${address}` : null;
};

// Gets scan URL to view token balances for a specific account
export const getTokenUrl = (
  chainId: number,
  accountAddress: string,
  tokenAddress: string
): string | null => {
  const baseUrls: Record<number, string> = {
    // Mainnet
    [ChainId.Mainnet]: `https://etherscan.io/token/`,
    [ChainId.Optimism]: `https://optimistic.etherscan.io/token/`,
    [ChainId.Arbitrum]: `https://arbiscan.io/token/`,
    [ChainId.Base]: `https://basescan.org/token/`,
    // Testnet
    [ChainId.Sepolia]: `https://sepolia.etherscan.io/token/`,
    [ChainId.OptimismSepolia]: `https://sepolia-optimism.etherscan.io/token/`,
    [ChainId.ArbitrumSepolia]: `https://sepolia.arbiscan.io/token/`,
    [ChainId.BaseSepolia]: `https://sepolia.basescan.org/token/`,
  };
  return baseUrls[chainId]
    ? `${baseUrls[chainId]}${tokenAddress}?a=${accountAddress}`
    : null;
};

// A read-only ERC-20 utility class for fetching token details and balances
export class ERC20 {
  private static abi = [
    "function balanceOf(address account) external view returns (uint256)",
    "function name() public view returns (string)",
    "function symbol() public view returns (string)",
    "function decimals() public view returns (uint8)",
    "function allowance(address owner, address spender) external view returns (uint256)",
  ];

  public readonly address: string;
  private token: Contract;

  public static init(address: string, singer: ContractRunner) {
    const token = new Contract(address as string, ERC20.abi, singer);
    return new ERC20(token, address);
  }

  // e.g.: 1.0 -> 1000000000000000000n
  public static parseAmount(amount: number, decimals: number): bigint {
    return parseUnits(amount.toString(), decimals);
  }

  // e.g.: 4500000000n -> 4.5
  public static formatAmount(amount: bigint, decimals: number): number {
    return Number(formatUnits(amount, decimals));
  }

  private constructor(token: Contract, address: string) {
    this.token = token;
    this.address = address;
  }

  public async name(): Promise<string> {
    return await this.token.name();
  }

  public async symbol(): Promise<string> {
    return await this.token.symbol();
  }

  public async decimals(): Promise<number> {
    return toNumber(await this.token.decimals());
  }

  public async balanceOf(account: string): Promise<bigint> {
    return await this.token.balanceOf(account);
  }

  // e.g.: 1.0 -> 1000000000000000000n
  public async parseAmount(amount: number): Promise<bigint> {
    return parseUnits(amount.toString(), await this.decimals());
  }

  // e.g.: 4500000000n -> 4.5
  public async formatAmount(amount: bigint): Promise<number> {
    return Number(formatUnits(amount, await this.decimals()));
  }

  public async allowance(owner: string, spender: string): Promise<bigint> {
    return await this.token.allowance(owner, spender);
  }
}
