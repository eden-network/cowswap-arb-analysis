import { readFileSync, writeFileSync } from 'fs';


interface CowOrder {
    id: string, 
    amountIn: number,
    amountOut: number,
}

interface Opportunity {
    timestamp_ms: number, 
    tokenIn: string,
    tokenOut: string,
    cowOrder: CowOrder,
    binanceMatch: BinanceMatch,
    oneInchMatch: OneInchMatch,
    binanceOneinchSpreadEth: number,
    binanceOrderSpreadEth: number,
}

interface BinanceMatch {
    marketSymbol: string;
    amountIn: number, 
    amountOut: number,
}

interface OneInchMatch {
    amountIn: number;
    amountOut: number;
}



export class Logger {

    logOpportunity(
        opp: Opportunity
    ) {
        const opportunities = this.readOpportunities();
        opportunities.push(opp);
        this.writeOpportunities(opportunities);
    }

    readOrders(): Array<CowOrder> {
        const orders = readFileSync('data/orders.json', 'utf8');
        return JSON.parse(orders);
    }

    writeOrders(orders: Array<CowOrder>) {
        writeFileSync('data/orders.json', JSON.stringify(orders, null, 4));
    }

    readOpportunities(): Array<Opportunity> {
        const opportunities = readFileSync('data/opportunities.json', 'utf8');
        return JSON.parse(opportunities);
    }

    writeOpportunities(opportunities: Array<Opportunity>) {
        writeFileSync('data/opportunities.json', JSON.stringify(opportunities, null, 4));
    }


}