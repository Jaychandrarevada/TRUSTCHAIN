/**
 * MetaMask / EIP-1193 integration (PART 10) — frontend port of the blockchain
 * module's wallet integration, scoped per the approved architecture:
 * wallet = OPTIONAL login/linking via challenge signatures. End users never
 * send transactions or pay gas (the backend relayer owns the chain).
 */
import { BrowserProvider } from "ethers";
import { SUPPORTED_CHAINS } from "@/constants";

/** Minimal EIP-1193 provider surface — only what this module actually calls. */
interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export type WalletErrorCode =
  | "NO_WALLET"
  | "USER_REJECTED"
  | "WRONG_CHAIN"
  | "REQUEST_PENDING"
  | "UNKNOWN";

export class WalletError extends Error {
  constructor(public readonly code: WalletErrorCode, message: string) {
    super(message);
    this.name = "WalletError";
  }
}

/** Human-actionable messages per error (spec NFR-USE-03). */
export const WALLET_ERROR_MESSAGES: Record<WalletErrorCode, string> = {
  NO_WALLET: "No wallet detected. Install MetaMask to continue.",
  USER_REJECTED: "Request was cancelled in the wallet.",
  WRONG_CHAIN: "Your wallet is on an unsupported network.",
  REQUEST_PENDING: "A wallet prompt is already open — check MetaMask.",
  UNKNOWN: "Unexpected wallet error. Try again.",
};

function injected(): Eip1193Provider | undefined {
  return (globalThis as typeof globalThis & Window).ethereum;
}

function toWalletError(err: unknown): WalletError {
  const e = err as { code?: number; message?: string };
  if (e?.code === 4001) return new WalletError("USER_REJECTED", WALLET_ERROR_MESSAGES.USER_REJECTED);
  if (e?.code === -32002) return new WalletError("REQUEST_PENDING", WALLET_ERROR_MESSAGES.REQUEST_PENDING);
  return new WalletError("UNKNOWN", e?.message ?? WALLET_ERROR_MESSAGES.UNKNOWN);
}

export function isWalletAvailable(): boolean {
  return !!injected();
}

/** Connect: request accounts + validate the chain. */
export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  const eth = injected();
  if (!eth) throw new WalletError("NO_WALLET", WALLET_ERROR_MESSAGES.NO_WALLET);
  try {
    const provider = new BrowserProvider(eth);
    const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    if (!SUPPORTED_CHAINS[chainId]) {
      throw new WalletError("WRONG_CHAIN", `Unsupported network (chainId ${chainId}).`);
    }
    return { address: accounts[0], chainId };
  } catch (err) {
    if (err instanceof WalletError) throw err;
    throw toWalletError(err);
  }
}

/** Ask the wallet to switch chains (wallet-switching support). */
export async function switchChain(chainId: number): Promise<void> {
  const eth = injected();
  if (!eth) throw new WalletError("NO_WALLET", WALLET_ERROR_MESSAGES.NO_WALLET);
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x" + chainId.toString(16) }],
    });
  } catch (err) {
    throw toWalletError(err);
  }
}

/** Sign the server-issued challenge (EIP-191 personal_sign). */
export async function signChallenge(address: string, message: string): Promise<string> {
  const eth = injected();
  if (!eth) throw new WalletError("NO_WALLET", WALLET_ERROR_MESSAGES.NO_WALLET);
  try {
    const provider = new BrowserProvider(eth);
    const signer = await provider.getSigner(address);
    return await signer.signMessage(message);
  } catch (err) {
    throw toWalletError(err);
  }
}

/** Subscribe to account/chain changes; returns unsubscribe. */
export function onWalletEvents(handlers: {
  accountsChanged?: (accounts: string[]) => void;
  chainChanged?: (chainId: number) => void;
}): () => void {
  const eth = injected();
  if (!eth?.on) return () => undefined;
  const onAccounts = (...args: unknown[]) => handlers.accountsChanged?.(args[0] as string[]);
  const onChain = (...args: unknown[]) => handlers.chainChanged?.(parseInt(args[0] as string, 16));
  eth.on("accountsChanged", onAccounts);
  eth.on("chainChanged", onChain);
  return () => {
    eth.removeListener?.("accountsChanged", onAccounts);
    eth.removeListener?.("chainChanged", onChain);
  };
}
