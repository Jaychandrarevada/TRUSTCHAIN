"""
Blockchain client — Web3.py integration with the deployed TrustChain contracts
(blockchain/ Hardhat project) plus a full in-process MOCK for dev/tests.

Design (DIP): services depend on the `BlockchainClient` interface; the factory
picks Web3ChainClient or MockChainClient from config. The mock reproduces the
contracts' OBSERVABLE semantics (duplicate-root rejection, monotonic status
versions, issuer gating) so business-logic tests exercise real rules without a
node.

Security posture mirrors the relayer model (TDD §8):
- chain-ID validation on connect (WrongChainError — replay-scope safety)
- EIP-1559 fees with estimate+20% gas margin
- bounded retries with backoff; duplicate-root revert treated as idempotent OK
- dev/testnet signs with RELAYER_PRIVATE_KEY; production signs via KMS.
"""
from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.errors import BlockchainError, ChainUnavailableError, WrongChainError

log = logging.getLogger("trustchain.chain")

# Minimal ABIs — only the functions/events this backend calls (full ABIs ship
# with the blockchain package artifacts).
CERTIFICATE_ANCHOR_ABI = [
    {"name": "anchorRoot", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "root", "type": "bytes32"}, {"name": "issuerId", "type": "uint64"},
                {"name": "batchRef", "type": "bytes32"}, {"name": "anchorType", "type": "uint8"},
                {"name": "metadataURI", "type": "string"}], "outputs": []},
    {"name": "isAnchored", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "root", "type": "bytes32"}], "outputs": [{"type": "bool"}]},
    {"name": "getAnchor", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "root", "type": "bytes32"}],
     "outputs": [{"components": [{"name": "issuerId", "type": "uint64"},
                                 {"name": "timestamp", "type": "uint40"},
                                 {"name": "anchorType", "type": "uint8"}], "type": "tuple"}]},
]
REVOCATION_REGISTRY_ABI = [
    {"name": "updateStatusRoot", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "issuerId", "type": "uint64"}, {"name": "listId", "type": "bytes32"},
                {"name": "root", "type": "bytes32"}, {"name": "version", "type": "uint32"},
                {"name": "listURI", "type": "string"}], "outputs": []},
    {"name": "getStatusRoot", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "issuerId", "type": "uint64"}, {"name": "listId", "type": "bytes32"}],
     "outputs": [{"type": "bytes32"}]},
]
ISSUER_REGISTRY_ABI = [
    {"name": "registerIssuer", "type": "function", "stateMutability": "nonpayable",
     "inputs": [{"name": "issuerId", "type": "uint64"}, {"name": "didHash", "type": "bytes32"},
                {"name": "initialKeyHash", "type": "bytes32"}, {"name": "metadataURI", "type": "string"}],
     "outputs": []},
    {"name": "isActiveIssuer", "type": "function", "stateMutability": "view",
     "inputs": [{"name": "issuerId", "type": "uint64"}], "outputs": [{"type": "bool"}]},
]


@dataclass
class TxResult:
    tx_hash: str
    block_number: int
    gas_used: int
    status: str  # "confirmed"


class BlockchainClient(ABC):
    """Port used by services (issuance anchoring, verification, revocation)."""

    @abstractmethod
    def anchor_root(self, root: str, issuer_id: int, batch_ref: str,
                    anchor_type: int = 0, metadata_uri: str = "") -> TxResult: ...

    @abstractmethod
    def is_anchored(self, root: str) -> bool: ...

    @abstractmethod
    def update_status_root(self, issuer_id: int, list_id: str, root: str,
                           version: int, list_uri: str = "") -> TxResult: ...

    @abstractmethod
    def get_status_root(self, issuer_id: int, list_id: str) -> str | None: ...

    @abstractmethod
    def register_issuer(self, issuer_id: int, did_hash: str, key_hash: str,
                        metadata_uri: str = "") -> TxResult: ...

    @abstractmethod
    def is_active_issuer(self, issuer_id: int) -> bool: ...


class MockChainClient(BlockchainClient):
    """
    In-process chain double reproducing contract semantics (tests/dev).

    Optional file persistence (`state_file`): when set, chain state is saved to
    a JSON file so it survives across processes — this is what makes the local
    demo work, where the seed script and the server run as SEPARATE processes
    and must share the same "chain" (anchored roots, registered issuers). Tests
    pass no file and keep the fast pure-memory behavior.
    """

    def __init__(self, state_file: str | None = None) -> None:
        self._file = state_file
        self._anchors: dict[str, dict] = {}
        self._status: dict[str, dict] = {}
        self._issuers: dict[str, bool] = {}
        self._height = 1_000
        self._load()

    # ── persistence ───────────────────────────────────────────────────────────
    def _load(self) -> None:
        if not self._file:
            return
        import json
        import os

        if os.path.exists(self._file):
            try:
                with open(self._file, encoding="utf-8") as fh:
                    data = json.load(fh)
                self._anchors = data.get("anchors", {})
                self._status = data.get("status", {})
                self._issuers = {int(k): v for k, v in data.get("issuers", {}).items()}
                self._height = data.get("height", 1_000)
            except (json.JSONDecodeError, OSError):
                pass  # corrupt/partial file → start fresh (demo-safe)

    def _save(self) -> None:
        if not self._file:
            return
        import json

        with open(self._file, "w", encoding="utf-8") as fh:
            json.dump({"anchors": self._anchors, "status": self._status,
                       "issuers": {str(k): v for k, v in self._issuers.items()},
                       "height": self._height}, fh)

    @staticmethod
    def _skey(issuer_id: int, list_id: str) -> str:
        return f"{issuer_id}:{list_id}"

    def _tx(self) -> TxResult:
        self._height += 1
        return TxResult(tx_hash="0x" + f"{self._height:064x}", block_number=self._height,
                        gas_used=68_000, status="confirmed")

    def anchor_root(self, root, issuer_id, batch_ref, anchor_type=0, metadata_uri="") -> TxResult:
        root = root.lower()
        if root in self._anchors:  # contract invariant A1
            raise BlockchainError("RootAlreadyAnchored")
        if anchor_type != 2 and not self._issuers.get(issuer_id, False):  # invariant A3
            raise BlockchainError("IssuerNotEligible")
        tx = self._tx()
        self._anchors[root] = {"issuer_id": issuer_id, "batch_ref": batch_ref,
                               "block": tx.block_number, "timestamp": int(time.time())}
        self._save()
        return tx

    def is_anchored(self, root) -> bool:
        return root.lower() in self._anchors

    def update_status_root(self, issuer_id, list_id, root, version, list_uri="") -> TxResult:
        key = self._skey(issuer_id, list_id)
        current = self._status.get(key, {"version": 0})
        if version <= current["version"]:  # contract invariant S1
            raise BlockchainError("NonMonotonicVersion")
        tx = self._tx()
        self._status[key] = {"root": root.lower(), "version": version}
        self._save()
        return tx

    def get_status_root(self, issuer_id, list_id) -> str | None:
        entry = self._status.get(self._skey(issuer_id, list_id))
        return entry["root"] if entry else None

    def register_issuer(self, issuer_id, did_hash, key_hash, metadata_uri="") -> TxResult:
        if self._issuers.get(issuer_id):
            raise BlockchainError("IssuerAlreadyRegistered")
        self._issuers[issuer_id] = True
        self._save()
        return self._tx()

    def is_active_issuer(self, issuer_id) -> bool:
        return self._issuers.get(issuer_id, False)


class Web3ChainClient(BlockchainClient):
    """Real client: RPC + local signing (dev/testnet) or KMS signer (prod)."""

    RETRIES = 3
    BACKOFF_SECONDS = 2.0

    def __init__(self, rpc_url: str, chain_id: int, relayer_key: str,
                 anchor_addr: str, revocation_addr: str, issuer_addr: str) -> None:
        from web3 import Web3  # imported lazily so mock mode needs no RPC

        self.w3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 15}))
        if not self.w3.is_connected():
            raise ChainUnavailableError(f"RPC unreachable: {rpc_url}")
        # Chain-ID validation (network + replay-scope safety, TDD §8.7)
        actual = self.w3.eth.chain_id
        if actual != chain_id:
            raise WrongChainError(f"Expected chainId {chain_id}, node reports {actual}.")

        self.chain_id = chain_id
        self.account = self.w3.eth.account.from_key(relayer_key)
        self.anchor = self.w3.eth.contract(address=Web3.to_checksum_address(anchor_addr),
                                           abi=CERTIFICATE_ANCHOR_ABI)
        self.revocation = self.w3.eth.contract(address=Web3.to_checksum_address(revocation_addr),
                                               abi=REVOCATION_REGISTRY_ABI)
        self.issuers = self.w3.eth.contract(address=Web3.to_checksum_address(issuer_addr),
                                            abi=ISSUER_REGISTRY_ABI)

    # ── internals ────────────────────────────────────────────────────────────
    def _send(self, fn_call) -> TxResult:
        """Sign+send with EIP-1559 fees, +20% gas margin, bounded retries."""
        last: Exception | None = None
        for attempt in range(1, self.RETRIES + 1):
            try:
                gas = int(fn_call.estimate_gas({"from": self.account.address}) * 1.2)
                base = self.w3.eth.get_block("latest").get("baseFeePerGas", 0)
                tip = self.w3.eth.max_priority_fee
                tx = fn_call.build_transaction({
                    "from": self.account.address,
                    "nonce": self.w3.eth.get_transaction_count(self.account.address),
                    "gas": gas,
                    "maxFeePerGas": base * 2 + tip,
                    "maxPriorityFeePerGas": tip,
                    "chainId": self.chain_id,  # EIP-155 replay protection
                })
                signed = self.account.sign_transaction(tx)
                # web3 v7 renamed rawTransaction → raw_transaction; support both.
                raw = getattr(signed, "raw_transaction", None) or getattr(signed, "rawTransaction")
                tx_hash = self.w3.eth.send_raw_transaction(raw)
                receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
                if receipt.status != 1:
                    raise BlockchainError(f"Transaction reverted: {tx_hash.hex()}")
                log.info("chain_tx", extra={"tx": tx_hash.hex(), "block": receipt.blockNumber,
                                            "gas_used": receipt.gasUsed})
                return TxResult(tx_hash.hex(), receipt.blockNumber, receipt.gasUsed, "confirmed")
            except BlockchainError:
                raise  # deterministic revert — retrying won't help
            except Exception as exc:  # transient RPC/network issues
                last = exc
                log.warning("chain_retry attempt=%s err=%s", attempt, exc)
                time.sleep(self.BACKOFF_SECONDS * attempt)
        raise ChainUnavailableError(f"Chain call failed after retries: {last}")

    @staticmethod
    def _b32(hexstr: str) -> bytes:
        return bytes.fromhex(hexstr.removeprefix("0x")).rjust(32, b"\x00")

    # ── interface ────────────────────────────────────────────────────────────
    def anchor_root(self, root, issuer_id, batch_ref, anchor_type=0, metadata_uri="") -> TxResult:
        return self._send(self.anchor.functions.anchorRoot(
            self._b32(root), issuer_id, self._b32(batch_ref), anchor_type, metadata_uri))

    def is_anchored(self, root) -> bool:
        return self.anchor.functions.isAnchored(self._b32(root)).call()

    def update_status_root(self, issuer_id, list_id, root, version, list_uri="") -> TxResult:
        return self._send(self.revocation.functions.updateStatusRoot(
            issuer_id, self._b32(list_id), self._b32(root), version, list_uri))

    def get_status_root(self, issuer_id, list_id) -> str | None:
        raw = self.revocation.functions.getStatusRoot(issuer_id, self._b32(list_id)).call()
        value = "0x" + raw.hex()
        return None if int(value, 16) == 0 else value

    def register_issuer(self, issuer_id, did_hash, key_hash, metadata_uri="") -> TxResult:
        return self._send(self.issuers.functions.registerIssuer(
            issuer_id, self._b32(did_hash), self._b32(key_hash), metadata_uri))

    def is_active_issuer(self, issuer_id) -> bool:
        return self.issuers.functions.isActiveIssuer(issuer_id).call()


def make_chain_client(config) -> BlockchainClient:
    """Factory: mock for dev/tests, Web3 for staging/prod (config-driven)."""
    if config["BLOCKCHAIN_MODE"] == "web3":
        return Web3ChainClient(
            rpc_url=config["RPC_URL"], chain_id=config["CHAIN_ID"],
            relayer_key=config["RELAYER_PRIVATE_KEY"],
            anchor_addr=config["CERTIFICATE_ANCHOR_ADDRESS"],
            revocation_addr=config["REVOCATION_REGISTRY_ADDRESS"],
            issuer_addr=config["ISSUER_REGISTRY_ADDRESS"],
        )
    # Local demo: MOCK_CHAIN_STATE_FILE persists mock state across the seed and
    # server processes so certificates verify as VALID. Unset (tests) = memory.
    return MockChainClient(state_file=config.get("MOCK_CHAIN_STATE_FILE") or None)
