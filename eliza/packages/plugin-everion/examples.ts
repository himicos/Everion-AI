import { ActionExample } from "@elizaos/core";

export const getMarsRoverExamples: ActionExample[][] = [
    [
        {
            user: "{{user1}}",
            content: {
                text: "I wonder what mars looks like today?",
            },
        },
        {
            user: "{{agent}}",
            content: {
                text: "Let me analyse coin data.",
                action: "GET_ANALYSIS_RESULT",
            },
        }
    ]
]