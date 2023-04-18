import { CowAuctionUrl } from './config';
import { ethers } from 'ethers';
import { Side } from './common';
import fetch from 'node-fetch';


export enum CowOrderKind {
    ExactQuote = 'exactQuote', 
    ExactBase = 'exactBase',
    FOK = 'FOK' // todo: implement for liqudity orders
}

export type CowOrder = {
    uid: string,
    baseToken: string,
    quoteToken: string,
    baseAmountFix: number,
    quoteAmountFix: number,
    baseAmount: string, 
    quoteAmount: string,
    kind: CowOrderKind,
    side: Side,
    priceWeight: string, // weight of the price to determine priority
    reward: number
}

export class CowBook {

    markets = new Map<string, Array<string>>();
    ordersById = new Map<string, CowOrder>();
    whitelistedTokens: Set<string>;
    tokenPrices;

    constructor(whitelistedTokens: Array<string> | null = null) {
        if (whitelistedTokens) {
            this.whitelistedTokens = new Set(whitelistedTokens.map(token => token.toLowerCase()));
        }
    }

    async sync() {
        this.ordersById.clear();
        this.markets.clear();

        const { prices, orders } = await fetchCowAuction();
        this.tokenPrices = prices;

        for (const _order of orders) {
            if (!this.isWhitelisted(_order.sellToken, _order.buyToken))
                continue;

            const priceWeight = CowBook.calcPriceWeight(_order.sellAmount, _order.buyAmount);
            const kind = _order.kind == 'sell' ? CowOrderKind.ExactBase : CowOrderKind.ExactQuote;

            const cowOrder: CowOrder = {
                uid: _order.uid,
                baseToken: _order.sellToken,
                quoteToken: _order.buyToken,
                baseAmount: _order.sellAmount,
                quoteAmount: _order.buyAmount,
                baseAmountFix: null,
                quoteAmountFix: null,
                priceWeight: priceWeight,
                side: Side.Ask,
                kind,
                reward: 0,
            }


            this.ordersById.set(cowOrder.uid, cowOrder);
            const marketKey = CowBook.makeMarketKey(cowOrder.baseToken, cowOrder.quoteToken);
            if (!this.markets.has(marketKey)) {
                this.markets.set(marketKey, []);
            }
            const orders = this.markets.get(marketKey)
            orders.push(cowOrder.uid)
            orders.sort((a, b) => {
                if (BigInt(this.ordersById.get(a).priceWeight) < BigInt(this.ordersById.get(b).priceWeight))
                    return -1;
                return 1;
            })
            this.markets.set(marketKey, orders)
        }
    }

    getOrdersForMarket(marketKey) {
        const orders = this.markets.get(marketKey);
        return orders.map(orderId => this.ordersById.get(orderId));
    }

    getOrdersForPair(baseToken: string, quoteToken: string) {
        const marketKey = CowBook.makeMarketKey(baseToken, quoteToken);
        return this.getOrdersForMarket(marketKey);
    }

    async queryFromQuote() {}

    async queryFromBase() {}

    isWhitelisted(baseToken, quoteToken) {
        if (
            this.whitelistedTokens && (
            !this.whitelistedTokens.has(baseToken.toLowerCase()) || 
            !this.whitelistedTokens.has(quoteToken.toLowerCase())
        ))
            return false;
        return true;
    }

    static calcPriceWeight(baseAmountStr, quoteAmountStr) {
        let a = ethers.parseUnits('1', 18);
        return (a * BigInt(quoteAmountStr) / BigInt(baseAmountStr)).toString();
    }

    static makeMarketKey(baseToken, quoteToken) {
        return `${baseToken.toLowerCase()}_${quoteToken.toLowerCase()}`;
    }

    getPriceInEth(tokenAddress: string) {
        return this.tokenPrices[tokenAddress];
    }


}

export async function fetchCowAuction() {
    return fetch(CowAuctionUrl)
        .then(r => r.json())
        .catch(e => console.log(e));
}

export function reverseCowOrder(order: CowOrder): CowOrder {
    return {
        ...order,
        uid: order.uid,
        baseToken: order.quoteToken,
        quoteToken: order.baseToken,
        baseAmount: order.quoteAmount,
        quoteAmount: order.baseAmount,
        baseAmountFix: order.quoteAmountFix,
        quoteAmountFix: order.baseAmountFix,
        kind: order.kind === CowOrderKind.ExactBase ? CowOrderKind.ExactQuote : CowOrderKind.ExactBase,
        side: order.side === Side.Ask ? Side.Bid : Side.Ask,
    }
}