import * as dotenv from 'dotenv';

dotenv.config();

export const CowAuctionUrl = 'https://api.cow.fi/mainnet/api/v1/auction';
export const RunDelayMs = 3000;
export const EthRpcUrl = process.env.RPC_URL || 'http://localhost:8545';
export const BinanceSpotKey = process.env.BINANCE_SPOT_KEY;
export const BinanceSpotSecret = process.env.BINANCE_SPOT_SECRET;
export const BinanceTickLimit = 200;

const labelToErc20Ethereum = {
    'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    'BUSD': '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
    'WSTETH': '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    'ETH': '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
}

export const Erc20Whitelist = [
    labelToErc20Ethereum.ETH,
    labelToErc20Ethereum.WETH,
    labelToErc20Ethereum.USDC,
    labelToErc20Ethereum.USDT,
    labelToErc20Ethereum.DAI,
    labelToErc20Ethereum.BUSD,
    labelToErc20Ethereum.WBTC,
]
const Stablecoins = [
    labelToErc20Ethereum.USDC,
    labelToErc20Ethereum.USDT,
    labelToErc20Ethereum.DAI,
    labelToErc20Ethereum.BUSD,
]

const BinanceMarkets = [
    {
        ticker: "ETHBUSD",
        ethereumBase: [labelToErc20Ethereum.ETH, labelToErc20Ethereum.WETH].map(t => t.toLowerCase()),
        ethereumQuote: [...Stablecoins].map(t => t.toLowerCase()),
    }, 
    {
        ticker: "ETHUSDT",
        ethereumBase: [labelToErc20Ethereum.ETH, labelToErc20Ethereum.WETH].map(t => t.toLowerCase()),
        ethereumQuote: [...Stablecoins].map(t => t.toLowerCase()),
    },
    {
        ticker: "BTCBUSD",
        ethereumBase: [labelToErc20Ethereum.WBTC].map(t => t.toLowerCase()),
        ethereumQuote: [...Stablecoins].map(t => t.toLowerCase()),
    },
    {
        ticker: "BTCUSDT",
        ethereumBase: [labelToErc20Ethereum.WBTC].map(t => t.toLowerCase()),
        ethereumQuote: [...Stablecoins].map(t => t.toLowerCase()),
    }
];

interface CowBinanceMarket {
    ticker: string;
    reversedBaseQuote: boolean;
}

export function findBinanceMarkets(ethereumBase, ethereumQuote): Array<CowBinanceMarket> {
    ethereumBase = ethereumBase.toLowerCase();
    ethereumQuote = ethereumQuote.toLowerCase();

    const foundMarkets: Array<CowBinanceMarket> = [];

    for (const market of BinanceMarkets) {
        if (market.ethereumBase.includes(ethereumBase) && market.ethereumQuote.includes(ethereumQuote)) {
            foundMarkets.push({
                ticker: market.ticker,
                reversedBaseQuote: false,
            });
        } else if (market.ethereumBase.includes(ethereumQuote) && market.ethereumQuote.includes(ethereumBase)) {
            foundMarkets.push({
                ticker: market.ticker,
                reversedBaseQuote: true,
            });
        }
    }

    return Array.from(new Set(foundMarkets));
}

