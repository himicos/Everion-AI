export interface analyseCoin {
    price: number;
    priceChange24h: number;
    totalSupply: number;
    holders: number;
    marketCap: number;
    top10HoldersPercentage: number;
    verificationStatus: boolean;
    scamStatus: boolean;
}
export interface AnalysisResult {
    id: string;
    name: string;
    description: string;
    result: string;
}

export interface AnalysisResultInput {
    analysisResult: AnalysisResult;
}