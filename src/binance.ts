import Binance from 'binance-api-node';
import { Side } from './common';


export class BinanceQuoter {

    client;

    constructor(spotKey, spotSecret) {
        this.client = Binance({ apiKey: spotKey, apiSecret: spotSecret });
    }

    async queryExactBase(symbol: string, side: Side, baseAmountIn: number, limit=100) {
        try {
            return await this._queryExactBase(symbol, side, baseAmountIn, limit);
        } catch {
            return { filled: 0, amountOut: 0 }
        }
    }

    async _queryExactBase(symbol: string, side: Side, baseAmountIn: number, limit=100) {
        const book = await this.client.book({ symbol, limit });
        const bookSide = side === Side.Ask ? book.asks : book.bids;

        let quoteAmountOut = 0;
        let baseAmountLeft = baseAmountIn;
        for (const {price, quantity} of bookSide) {
            const baseTickIn = Math.min(parseFloat(quantity), baseAmountLeft);
            const quoteTickOut = baseTickIn * parseFloat(price);
            baseAmountLeft -= baseTickIn;
            quoteAmountOut += quoteTickOut;
            if (baseAmountLeft <= 0)
                break;
        }

        return {
            filled: baseAmountIn - baseAmountLeft,
            amountOut: quoteAmountOut,
        }
    }

    async queryExactQuote(symbol: string, side: Side, quoteAmountIn: number, limit=10) {
        try {
            return await this._queryExactQuote(symbol, side, quoteAmountIn, limit);
        } catch {
            return { filled: 0, amountOut: 0 }
        }
    }

    async _queryExactQuote(symbol: string, side: Side, quoteAmountIn: number, limit=10) {
        const book = await this.client.book({ symbol, limit });
        const bookSide = side === Side.Ask ? book.asks : book.bids;

        let baseAmountOut = 0;
        let quoteAmountLeft = quoteAmountIn;
        for (const {price, quantity} of bookSide) {
            const quoteTickFull = parseFloat(quantity) * parseFloat(price);
            const quoteTickIn = Math.min(quoteTickFull, quoteAmountLeft);
            const baseTickOut = quoteTickIn / parseFloat(price);
            quoteAmountLeft -= quoteTickIn;
            baseAmountOut += baseTickOut;
            if (quoteAmountLeft <= 0)
                break;
        }

        return {
            filled: quoteAmountIn - quoteAmountLeft,
            amountOut: baseAmountOut,
        }
    }
    


}