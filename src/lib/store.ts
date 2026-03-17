interface Store {
    keeperSessionId: string | null;
    message: string;
    clients: Set<(data: string) => void>;
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
    };
}

export const store = global.__houseRulesStore;
