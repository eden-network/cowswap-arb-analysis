import { CowBook, CowOrderKind, reverseCowOrder } from './cow-book';
import { getOneInchQuote } from './one-inch';
import { BinanceQuoter } from './binance'
import { EvmUtils } from './evm-utils';
import { Logger } from './logger';
import { ethers } from 'ethers';
import { Side } from './common';
import * as config from './config';



export class Engine {

    cowbook: CowBook;
    evmUtils: EvmUtils;
    binanceQuoter: BinanceQuoter;
    tokenSymbolMap;
    decimalsMap;
    isInitialized = false;
    logger: Logger;

    constructor() {
        this.cowbook = new CowBook(config.Erc20Whitelist);
        this.evmUtils = new EvmUtils(config.EthRpcUrl);
        this.binanceQuoter = new BinanceQuoter(config.BinanceSpotKey, config.BinanceSpotSecret);
        this.logger = new Logger();
    }

    async init() {
        if (!this.isInitialized) {
            this.tokenSymbolMap = await this.evmUtils.getTokenSymbolsMap(config.Erc20Whitelist);
            this.decimalsMap = await this.evmUtils.getTokenDecimalsMap(config.Erc20Whitelist);
            this.isInitialized = true;
        }
    }

    async cycle() {
        await this.init();
        await this.cowbook.sync();
        await this.handleCowAuction();
    }

    async handleCowAuction() {
        const handleCowBinanceMatch = async (cowOrder, binanceMarket, tokenIn, tokenOut, amountIn, amountOut, cowAmountIn, cowAmountOut): Promise<Boolean> => {
            const [binanceCowSpread, spreadToken] = amountIn == cowAmountIn 
                ? [amountOut - cowAmountOut, tokenOut]
                : [cowAmountIn - amountIn, tokenIn];
            const binanceCowSpreadEth = parseFloat(this.formatAmount(spreadToken, binanceCowSpread));

            if (binanceCowSpreadEth > 0) {
                const oneinchAmountOut = await getOneInchQuote(
                    tokenIn, 
                    tokenOut, 
                    this.parseFromFixed(tokenIn, amountIn).toString()
                )
                const oneinchOut = this.parseToFixed(tokenOut, oneinchAmountOut.toTokenAmount);

                this.logger.logOpportunity({
                    timestamp_ms: Date.now(),
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    cowOrder: {
                        id: cowOrder.uid,
                        amountIn: cowAmountIn,
                        amountOut: cowAmountOut,
                    }, 
                    binanceMatch: {
                        marketSymbol: binanceMarket, 
                        amountIn: amountIn,
                        amountOut: amountOut,
                    },
                    oneInchMatch: {
                        amountIn: amountIn,
                        amountOut: oneinchOut,
                    }, 
                    binanceOneinchSpreadEth: amountOut - oneinchOut, 
                    binanceOrderSpreadEth: binanceCowSpreadEth,
                })

                console.log(`\t   1inch: ${amountIn} => ${this.parseToFixed(tokenOut, oneinchAmountOut.toTokenAmount)}`)
                console.log(`\n🚨 binanceCowSpreadEth: ${binanceCowSpreadEth} ETH`)
                console.log(`Swap ${this.tokenSymbolMap[tokenIn]} for ${this.tokenSymbolMap[tokenOut]}`)
                console.log(`\tcowlimit: ${cowAmountIn} => ${cowAmountOut}`)
                console.log(`\t binance: ${amountIn} => ${amountOut}`);
                console.log(cowOrder)
            

                return true;
            }

        }

        // for every market in the cowbook
        await Array.from(this.cowbook.markets.keys()).some(async (market) => {
            // for every order in the market (sorted by price / stop with first unprofitable order)
            for (const cowOrder of this.cowbook.getOrdersForMarket(market)) {
                cowOrder.baseAmountFix = this.parseToFixed(cowOrder.baseToken, cowOrder.baseAmount);
                cowOrder.quoteAmountFix = this.parseToFixed(cowOrder.quoteToken, cowOrder.quoteAmount);
                const binanceMatches = config.findBinanceMarkets(cowOrder.baseToken, cowOrder.quoteToken)

                let noneProfitable = true;
                // for every binance market that matches the cowbook market
                await Promise.all(binanceMatches.map(async cowBinanceMarket => {
                    const adjustedCowOrder = cowBinanceMarket.reversedBaseQuote ? reverseCowOrder(cowOrder) : cowOrder;
                    const binanceTakerSide = adjustedCowOrder.side == Side.Ask ? Side.Bid : Side.Ask;
                    
                    if (adjustedCowOrder.kind == CowOrderKind.ExactBase) {
                        const amountIn = adjustedCowOrder.baseAmountFix;
                        const { filled, amountOut } = await this.binanceQuoter.queryExactBase(
                            cowBinanceMarket.ticker,
                            binanceTakerSide,
                            amountIn,
                            config.BinanceTickLimit
                        )
        
                        if (filled != amountIn)
                            console.log(`❌ partial fill: ${filled}/${amountIn}`)
        
                        if (binanceTakerSide == Side.Bid) {
                            let hasSpread = await handleCowBinanceMatch(
                                cowOrder,
                                cowBinanceMarket.ticker,
                                adjustedCowOrder.baseToken, 
                                adjustedCowOrder.quoteToken, 
                                amountIn, 
                                amountOut, 
                                adjustedCowOrder.baseAmountFix, 
                                adjustedCowOrder.quoteAmountFix
                            )
                            noneProfitable = !hasSpread;
                        } else if (binanceTakerSide == Side.Ask) {
                            let hasSpread = await handleCowBinanceMatch(
                                cowOrder,
                                cowBinanceMarket.ticker,
                                adjustedCowOrder.quoteToken, 
                                adjustedCowOrder.baseToken, 
                                amountOut, 
                                amountIn, 
                                adjustedCowOrder.quoteAmountFix, 
                                adjustedCowOrder.baseAmountFix
                            )
                            noneProfitable = !hasSpread;
                        } else {
                            return
                        }                
                    } else if (adjustedCowOrder.kind == CowOrderKind.ExactQuote) {
                        const amountIn = adjustedCowOrder.quoteAmountFix;
                        const { filled, amountOut } = await this.binanceQuoter.queryExactQuote(
                            cowBinanceMarket.ticker,
                            binanceTakerSide,
                            amountIn, 
                            config.BinanceTickLimit
                        )
                        if (filled != amountIn)
                            console.log(`❌ partial fill: ${filled}/${amountIn}`)
        
                        if (binanceTakerSide == Side.Ask) {
                            let hasSpread = await handleCowBinanceMatch(
                                cowOrder,
                                cowBinanceMarket.ticker,
                                adjustedCowOrder.quoteToken, 
                                adjustedCowOrder.baseToken, 
                                amountIn, 
                                amountOut, 
                                adjustedCowOrder.quoteAmountFix, 
                                adjustedCowOrder.baseAmountFix
                            )
                            noneProfitable = !hasSpread;
                        } else if (binanceTakerSide == Side.Bid) {
                            let hasSpread = await handleCowBinanceMatch(
                                cowOrder,
                                cowBinanceMarket.ticker,
                                adjustedCowOrder.baseToken, 
                                adjustedCowOrder.quoteToken, 
                                amountOut, 
                                amountIn, 
                                adjustedCowOrder.baseAmountFix, 
                                adjustedCowOrder.quoteAmountFix
                            )
                            noneProfitable = !hasSpread;
                        }
                    } else {
                        console.log('Unsupported order type')
                    }
        

                }))
                
                if (noneProfitable) 
                    break
                
            }

        })

    }

    formatAmount(token, amountFixed) {
        if (['ETH', 'WETH'].includes(this.tokenSymbolMap[token]))
            return amountFixed
        return this.convertToEth(token, amountFixed)
    }

    parseToFixed(token:string, num: string) {
        const decimals = token == 'eth' ? 18 : this.decimalsMap[token.toLowerCase()];
        return parseFloat(ethers.formatUnits(BigInt(num), decimals))
    }

    parseFromFixed(token:string, num: number) {
        const decimals = this.decimalsMap[token.toLowerCase()];
        return ethers.parseUnits(num.toFixed(decimals), decimals)
    }

    convertToEth(token, amountFixed) {
        return ethers.formatUnits(
            (BigInt(this.cowbook.getPriceInEth(token)) * this.parseFromFixed(token, amountFixed)).toString(),
            36
        )
    }



}

