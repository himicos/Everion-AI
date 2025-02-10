import express from "express";
import { DirectClientInterface } from "@elizaos/client-direct";
import { IAgentRuntime } from "@elizaos/core";

const app = express();
app.use(express.json());

async function initializeDirectClient(runtime: IAgentRuntime) {
    const client = await DirectClientInterface.start(runtime);
    return client;
}

// Initialize the Direct Client and set up endpoints
async function setupEndpoints(runtime: IAgentRuntime) {
    const directClient = await initializeDirectClient(runtime);

    // Message endpoint
    app.post("/:agentId/message", async (req, res) => {
        const { agentId } = req.params;
        const response = await directClient.handleMessage(req.body);
        res.json(response);
    });

    // Image generation endpoint
    app.post("/:agentId/image", async (req, res) => {
        const { agentId } = req.params;
        const images = await directClient.generateImage(req.body);
        res.json(images);
    });

    // Add more custom endpoints as needed
    app.post("/:agentId/custom-endpoint", async (req, res) => {
        // Handle custom logic here
        const response = await directClient.handleCustomRequest(req.body);
        res.json(response);
    });
}

// Example runtime object
const runtime: IAgentRuntime = {
    // Initialize with your runtime settings
};

// Set up endpoints and start the server
setupEndpoints(runtime).then(() => {
    app.listen(3000, () => {
        console.log("Server is running on port 3000");
    });
});