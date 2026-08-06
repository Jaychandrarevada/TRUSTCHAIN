/**
 * MetaMask / EIP-1193 wallet integration module.
 *
 * SCOPE (per approved architecture, TDD §8.3/§10.3): end users NEVER need a
 * wallet — the platform relayer signs all transactions. This module serves the
 * two sanctioned wallet surfaces only:
 *   1. BYO-DID linking (P3): a holder proves control of an external wallet by
 *      signing a server-issued challenge (read/sign-message only — this module
 *      never initiates transactions or asks for funds).
 *   2. Governance/ops tooling: connecting an admin wallet to inspect contract
 *      state or interact with the Gnosis Safe UI.
 *
 * Framework-agnostic: pure TypeScript over the injected EIP-1193 provider;
 * wrap in your own React hook/store as needed (packages/ui integration).
 */
import { BrowserProvider, getAddress, verifyMessage } from "ethers";

/** Chains this build recognizes (TDD §8.6 + requested Sepolia support). */
export const SUPPORTED_CHAINS: Record<number, { name: string; explorer: string }> = {
  137: { name: "Polygon PoS", explorer: "https://polygonscan.com" },
  80002: { name: "Polygon Amoy (testnet)", explorer: "https://amoy.polygonscan.com" },
  11155111: { name: "Ethereum Sepolia (testnet)", explorer: "https://sepolia.etherscan.io" },
  31337: { name: "Local Hardhat", explorer: "" },
};

/** Typed error taxonomy so UIs can render exact, actionable messages (NFR-USE-03). */
export type WalletErrorCode =
  | "NO_WALLET"          // no injected provider — show install guidance
  | "USER_REJECTED"      // user dismissed the MetaMask prompt — not an error state
  | "WRONG_CHAIN"        // connected to an unsupported chain
  | "CHAIN_ADD_REJECTED" // user refused the add/switch-chain prompt
  | "SIGNATURE_INVALID"  // recovered signer ≠ claimed address
  | "REQUEST_PENDING"    // a MetaMask prompt is already open (-32002)
  | "UNKNOWN";

export class WalletError extends Error {
  constructor(public readonly code: WalletErrorCode, message: string) {
    super(message);
    this.name = "WalletError";
  }
}

/** Maps raw EIP-1193/MetaMask errors onto the taxonomy. */
function toWalletError(err: unknown): WalletError {
  const e = err as { code?: number; message?: string };
  if (e?.code === 4001) return new WalletError("USER_REJECTED", "Request was cancelled in the wallet.");
  if (e?.code === -32002)
    return new WalletError("REQUEST_PENDING", "A wallet prompt is already open — check MetaMask.");
  return new WalletError("UNKNOWN", e?.message ?? "Unexpected wallet error.");
}

/** Narrow accessor for the injected provider (undefined in non-wallet browsers). */
function injected(): any | undefined {
  return (globalThis as any).ethereum;
}

export interface WalletSession {
  address: string;   // EIP-55 checksummed
  chainId: number;
  chainName: string;
}

/**
 * Connects to MetaMask: requests accounts, validates the chain, returns a
 * normalized session. Throws typed {WalletError}s for every failure mode.
 */
export async function connectWallet(expectedChainId?: number): Promise<WalletSession> {
  const eth = injected();
  if (!eth) throw new WalletError("NO_WALLET", "No wallet detected. Install MetaMask to continue.");

  try {
    const provider = new BrowserProvider(eth);
    const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
    const address = getAddress(accounts[0]); // checksum normalization
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    // Chain validation (replay-scope safety: signatures/URLs are chain-pinned).
    if (!SUPPORTED_CHAINS[chainId]) {
      throw new WalletError("WRONG_CHAIN", `Unsupported network (chainId ${chainId}).`);
    }
    if (expectedChainId !== undefined && chainId !== expectedChainId) {
      await switchChain(expectedChainId); // may throw CHAIN_ADD_REJECTED
      return connectWallet(expectedChainId);
    }
    return { address, chainId, chainName: SUPPORTED_CHAINS[chainId].name };
  } catch (err) {
    if (err instanceof WalletError) throw err;
    throw toWalletError(err);
  }
}

/** Prompts MetaMask to switch (or add-then-switch) to the requested chain. */
export async function switchChain(chainId: number): Promise<void> {
  const eth = injected();
  if (!eth) throw new WalletError("NO_WALLET", "No wallet detected.");
  const hexId = "0x" + chainId.toString(16);
  try {
    await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (err) {
    const e = err as { code?: number };
    if (e?.code === 4902) {
      // Chain unknown to the wallet → offer to add it (public params only).
      const params = CHAIN_ADD_PARAMS[chainId];
      if (!params) throw new WalletError("WRONG_CHAIN", `Chain ${chainId} cannot be auto-added.`);
      try {
        await eth.request({ method: "wallet_addEthereumChain", params: [params] });
      } catch (addErr) {
        throw new WalletError("CHAIN_ADD_REJECTED", "Network add was declined in the wallet.");
      }
      return;
    }
    throw toWalletError(err);
  }
}

/** wallet_addEthereumChain payloads for the supported public chains. */
const CHAIN_ADD_PARAMS: Record<number, object> = {
  137: {
    chainId: "0x89",
    chainName: "Polygon PoS",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  80002: {
    chainId: "0x13882",
    chainName: "Polygon Amoy Testnet",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://rpc-amoy.polygon.technology"],
    blockExplorerUrls: ["https://amoy.polygonscan.com"],
  },
  11155111: {
    chainId: "0xaa36a7",
    chainName: "Sepolia Testnet",
    nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://rpc.sepolia.org"],
    blockExplorerUrls: ["https://sepolia.etherscan.io"],
  },
};

// ─────────────────────────── Challenge authentication ────────────────────────
// BYO-DID linking flow (TDD §10.3): server issues a nonce-bound challenge; the
// wallet signs it (EIP-191 personal_sign); the server verifies and links.
// Anti-phishing: the message states its exact purpose, origin, and expiry, and
// grants NO session by itself.

export interface WalletChallenge {
  address: string;   // address being linked
  nonce: string;     // server-issued, single-use, 5-min TTL
  origin: string;    // canonical app origin (binds the message to our domain)
  issuedAt: string;  // ISO-8601
  purpose: "link-did"; // the only sanctioned purpose in this build
}

/** Renders the canonical, human-readable challenge message. */
export function challengeMessage(c: WalletChallenge): string {
  return [
    "TrustChain wallet linking",
    "",
    `This signature links wallet ${c.address} to your TrustChain account.`,
    "It does NOT authorize any transaction or payment.",
    "",
    `Origin: ${c.origin}`,
    `Nonce: ${c.nonce}`,
    `Issued at: ${c.issuedAt}`,
  ].join("\n");
}

/** Client side: asks MetaMask to sign the challenge (personal_sign). */
export async function signChallenge(challenge: WalletChallenge): Promise<string> {
  const eth = injected();
  if (!eth) throw new WalletError("NO_WALLET", "No wallet detected.");
  try {
    const provider = new BrowserProvider(eth);
    const signer = await provider.getSigner(challenge.address);
    return await signer.signMessage(challengeMessage(challenge));
  } catch (err) {
    throw toWalletError(err);
  }
}

/**
 * Server side: verifies the signature and returns the checksummed signer.
 * Callers MUST additionally check: nonce unused + unexpired, origin matches,
 * and address equals the recovered signer (all enforced by the identity module).
 */
export function verifyChallengeSignature(challenge: WalletChallenge, signature: string): string {
  const recovered = verifyMessage(challengeMessage(challenge), signature);
  if (getAddress(recovered) !== getAddress(challenge.address)) {
    throw new WalletError("SIGNATURE_INVALID", "Signature does not match the claimed wallet.");
  }
  return getAddress(recovered);
}

// ───────────────────────────── Session listeners ─────────────────────────────

/**
 * Subscribes to account/chain changes; returns an unsubscribe function.
 * UI policy: account change or disconnect ends the linked-wallet UI state;
 * TrustChain login sessions are NOT wallet sessions and are unaffected.
 */
export function onWalletEvents(handlers: {
  accountsChanged?: (accounts: string[]) => void;
  chainChanged?: (chainId: number) => void;
  disconnect?: () => void;
}): () => void {
  const eth = injected();
  if (!eth?.on) return () => undefined;

  const onAccounts = (accs: string[]) => handlers.accountsChanged?.(accs);
  const onChain = (hexId: string) => handlers.chainChanged?.(parseInt(hexId, 16));
  const onDisc = () => handlers.disconnect?.();

  eth.on("accountsChanged", onAccounts);
  eth.on("chainChanged", onChain);
  eth.on("disconnect", onDisc);
  return () => {
    eth.removeListener?.("accountsChanged", onAccounts);
    eth.removeListener?.("chainChanged", onChain);
    eth.removeListener?.("disconnect", onDisc);
  };
}

/**
 * "Disconnect" for injected wallets = forget local session state (EIP-1193 has
 * no programmatic disconnect). Revokes site permission where supported.
 */
export async function disconnectWallet(): Promise<void> {
  const eth = injected();
  try {
    await eth?.request?.({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch {
    // Older MetaMask versions don't support revocation — local forget suffices.
  }
}

// ───────────────────────── Transaction confirmation UX ───────────────────────

/**
 * Waits for a transaction with confirmation-depth awareness (ops tooling only;
 * end-user flows never send transactions). Mirrors the relayer FSM semantics:
 * submitted → confirmed(N) — finality is checkpoint-based and tracked server-side.
 */
export async function waitForConfirmation(
  txHash: string,
  confirmations: number,
  onProgress?: (current: number, target: number) => void,
): Promise<void> {
  const eth = injected();
  if (!eth) throw new WalletError("NO_WALLET", "No wallet detected.");
  const provider = new BrowserProvider(eth);
  const receipt = await provider.waitForTransaction(txHash, 1);
  if (!receipt) throw new WalletError("UNKNOWN", "Transaction dropped from the mempool.");
  let current = 1;
  onProgress?.(current, confirmations);
  while (current < confirmations) {
    await new Promise((r) => setTimeout(r, 4000)); // ~2 Polygon blocks
    current = await receipt.confirmations();
    onProgress?.(Math.min(current, confirmations), confirmations);
  }
}
