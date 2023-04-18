

interface Quote {
    fromToken: string;
    toToken: string;
    fromTokenAmount: string;
    toTokenAmount: string;
    protocols: string[];
    gasPrice: string;
}

export async function getOneInchQuote(tokenFrom: string, tokenTo: string, amountIn: string): Promise<Quote> {
    const url = new URL('https://api.1inch.exchange/v3.0/1/quote');
    url.searchParams.set('fromTokenAddress', tokenFrom);
    url.searchParams.set('toTokenAddress', tokenTo);
    url.searchParams.set('amount', amountIn);
    // url.searchParams.set('complexityLevel', '3');
    // url.searchParams.set('mainRouteParts', '50');
    // url.searchParams.set('mainRouteParts', '100');
    const response = await fetch(url.toString());
    const data = await response.json();
    return data;
}