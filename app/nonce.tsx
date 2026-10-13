import { createContext, useContext } from "react";

/** Per-request CSP nonce. Provided on the server by entry.server.tsx; on the
    client it is empty (browsers hide nonce attributes after load, and
    hydration ignores nonce mismatches by design). */
export const NonceContext = createContext<string | undefined>(undefined);
export const useNonce = () => useContext(NonceContext);
