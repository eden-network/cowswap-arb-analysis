import {ethers} from 'ethers';


export class EvmUtils {

    provider; 

    constructor(providerUrl) {
        this.provider = new ethers.JsonRpcProvider(providerUrl);
    }

    async getTokenSymbolsMap(tokenAddresses) {
        return Promise.all(tokenAddresses.map(tokenAddress => {
            return this.getTokenSymbol(tokenAddress)
                .then(d => [tokenAddress.toLowerCase(), d]);
        })).then(a => Object.fromEntries(a));
    }
    
    async getTokenSymbol(tokenAddress) {
        if (tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
            return 'ETH';
        }
        const res = await this.provider.call({to: tokenAddress, data: '0x95d89b41'});
        return ethers.AbiCoder.defaultAbiCoder().decode(['string'], res)[0];
    }
    
    async getTokenDecimalsMap(tokenAddresses) {
        return Promise.all(tokenAddresses.map(tokenAddress => {
            return this.getTokenDecimals(tokenAddress)
                .then(d => [tokenAddress.toLowerCase(), d]);
        })).then(a => Object.fromEntries(a));
    }
    
    async getTokenDecimals(tokenAddress) {
        if (tokenAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
            return 18;
        }
        const res = await this.provider.call({to: tokenAddress, data: '0x313ce567'});
        return parseInt(res, 16);
    }

}