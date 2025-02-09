import {
    AnalysisResult,
    AnalysisResultInput,
} from "./types";

export const getAnalysisResult = async (
    input: AnalysisResultInput
): Promise<AnalysisResult> => {
    return {
        analysisResult: {
            id: "123",
            name: "Analysis Result",
            description: "This is an analysis result",
            result: "This is the result of the analysis",
        },
    };
};