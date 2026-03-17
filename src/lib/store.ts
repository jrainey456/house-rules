interface PlayerSession {
    id: string;
    connectedAt: Date;
    send: (data: string) => void;
    currentMessage: string; // Track what message this player currently has
}

interface Store {
    keeperSessionId: string | null;
    message: string;
    clients: Set<(data: string) => void>;
    playerSessions: Map<string, PlayerSession>;
}

declare global {
    // eslint-disable-next-line no-var
    var __houseRulesStore: Store | undefined;
}

if (!global.__houseRulesStore) {
    global.__houseRulesStore = {
        keeperSessionId: null,
        message: '',
        clients: new Set(),
        playerSessions: new Map(),
    };
}

export const store = global.__houseRulesStore;
