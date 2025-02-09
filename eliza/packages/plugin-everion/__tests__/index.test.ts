import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { EverionPlugin } from '../src';

// Mock dependencies
vi.mock('axios');

describe('EverionPlugin', () => {
    const mockCoinData = {
        price: 0.053508,
        priceChange24h: 0.6673632439582283,
        totalSupply: 1000000000,
        holders: 19200,
        marketCap: 53500000,
        top10HoldersPercentage: 15.4,
        verificationStatus: 'verified',
        scamStatus: 'None'
    };

    const mockCoinAddress = '0xf22da9a24ad027cccb5f2d496cbe91de953d363513db08a3a734d361c7c17503::LOFI::LOFI';

    it('generates the correct prompt for coin analysis', async () => {
        vi.spyOn(axios, 'get').mockResolvedValue({ data: mockCoinData });

        const result = await EverionPlugin.analyzeCoin(mockCoinAddress);

        const expectedPrompt = `
        Analyze the following coin data and provide a detailed market analysis:

        - Current Price: ${mockCoinData.price}
        - Price Change (24h): ${mockCoinData.priceChange24h}
        - Total Supply: ${mockCoinData.totalSupply}
        - Number of Holders: ${mockCoinData.holders}
        - Market Cap: ${mockCoinData.marketCap}
        - Top 10 Holders Percentage: ${mockCoinData.top10HoldersPercentage}
        - Verification Status: ${mockCoinData.verificationStatus}
        - Scam Status: ${mockCoinData.scamStatus}

        Provide insights on the coin's performance, potential risks, and overall market sentiment.
        `;

        expect(result).toContain(expectedPrompt.trim());
    });

    it('handles API errors gracefully', async () => {
        vi.spyOn(axios, 'get').mockRejectedValue(new Error('API Error'));

        const result = await EverionPlugin.analyzeCoin(mockCoinAddress);

        expect(result).toBe(`Failed to retrieve data for coin address ${mockCoinAddress}. Please try again later.`);
    });
});
