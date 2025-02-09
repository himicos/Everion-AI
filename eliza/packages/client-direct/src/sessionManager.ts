import { createSession, getSessionDetails, sendMessage } from "@elizaos/plugin-devin/src/providers/devinRequests";
import type { IAgentRuntime } from "@elizaos/core";

export class SessionManager {
    private runtime: IAgentRuntime;
    private sessions: Map<string, string>; // Map to store user sessions

    constructor(runtime: IAgentRuntime) {
        this.runtime = runtime;
        this.sessions = new Map();
    }

    async startSession(userId: string, prompt: string): Promise<string> {
        const session = await createSession(this.runtime, prompt);
        this.sessions.set(userId, session.session_id);
        return session.session_id;
    }

    async getSessionDetails(userId: string) {
        const sessionId = this.sessions.get(userId);
        if (!sessionId) {
            throw new Error("No active session found for user");
        }
        return await getSessionDetails(this.runtime, sessionId);
    }

    async sendMessage(userId: string, message: string) {
        const sessionId = this.sessions.get(userId);
        if (!sessionId) {
            throw new Error("No active session found for user");
        }
        await sendMessage(this.runtime, sessionId, message);
    }
}