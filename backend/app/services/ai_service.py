"""
AI assistant service — advisory only, never the source of truth.

Hard rule (explicit product requirement, not a style choice): the blockchain
verification pipeline decides verdicts; this service never does. Every
function here is called AFTER the real deterministic checks have already run
(verification_service.verify_certificate, the Merkle/anchor pipeline, etc.) —
it receives already-computed verdicts, checks, and hashes, and its only job
is to phrase them in plain language. It never invents a hash, transaction id,
block number, or institution fact that wasn't handed to it, and it never
gates or replaces a real check.

If ANTHROPIC_API_KEY isn't configured, every function raises
AiUnavailableError — the honest failure mode. Nothing here silently
fabricates a response when the real API is unreachable.
"""
from __future__ import annotations

import json
import logging

from flask import current_app

from app.errors import AiUnavailableError

log = logging.getLogger("trustchain.ai")

SYSTEM_PROMPT = """You are the TrustChain Assistant, embedded in a blockchain certificate verification platform.

Hard rules — never break these:
1. The blockchain is the ONLY source of truth for whether a certificate is valid. You never determine, guess, or override a verdict — you only explain verdicts and data that the platform's deterministic verification pipeline already computed and handed to you in the message below.
2. Never invent a hash, transaction ID, block number, date, name, or any other fact. Only use what appears in the data given to you. If something isn't there, say plainly that you don't have that information — do not guess.
3. You are always advisory. Never tell a user a certificate "is definitely real" or "is fake" — describe what the real checks found and let that data carry the weight. Never suggest you can revoke, approve, or issue anything — you explain and guide; humans and the deterministic pipeline act.
4. Be concise and plain-language. State uncertainty honestly rather than hedging vaguely.
"""

_client = None


def _get_client():
    global _client
    api_key = current_app.config.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise AiUnavailableError(
            "The AI assistant isn't configured on this deployment (no API key). "
            "The real verification and issuance pipeline is unaffected — this only "
            "disables plain-language explanations."
        )
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def _ask(user_content: str, *, max_tokens: int = 700, effort: str = "low",
         json_schema: dict | None = None) -> str:
    client = _get_client()
    model = current_app.config.get("ANTHROPIC_MODEL", "claude-opus-5")
    output_config: dict = {"effort": effort}
    if json_schema is not None:
        output_config["format"] = {"type": "json_schema", "schema": json_schema}

    try:
        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=SYSTEM_PROMPT,
            output_config=output_config,
            messages=[{"role": "user", "content": user_content}],
        )
    except Exception:
        log.exception("ai_request_failed")
        raise AiUnavailableError(
            "The AI assistant couldn't be reached. The real verification "
            "and issuance pipeline is unaffected."
        )

    if response.stop_reason == "refusal":
        raise AiUnavailableError("The AI assistant declined to answer this request.")
    for block in response.content:
        if block.type == "text":
            return block.text
    return ""


def explain_certificate(verdict: str, checks: dict, disclosed_fields: dict,
                        issuer_name: str | None) -> str:
    """Plain-language narration of a verdict the real pipeline already computed."""
    data = {"verdict": verdict, "checks": checks, "disclosed_fields": disclosed_fields,
            "issuer": issuer_name}
    prompt = (
        "Explain this certificate verification result to someone who isn't technical, "
        "in 3-5 sentences. Reference only the DATA below — never invent anything not "
        "present in it.\n\nDATA:\n" + json.dumps(data, indent=2, default=str)
    )
    return _ask(prompt, max_tokens=500, effort="low")


def explain_transaction(merkle_root: str | None, tx_hash: str | None, block: int | None) -> str:
    """Plain-language narration of real on-chain anchoring evidence."""
    data = {"merkle_root": merkle_root, "anchor_tx_hash": tx_hash, "anchor_block": block}
    prompt = (
        "Explain in plain language, in 3-4 sentences, what this blockchain anchoring "
        "record proves about a batch of certificates. Reference only the DATA below.\n\n"
        "DATA:\n" + json.dumps(data, indent=2, default=str)
    )
    return _ask(prompt, max_tokens=400, effort="low")


def chat(message: str, context: dict | None, history: list[dict]) -> str:
    """General assistant: first-time-user guidance, help institutions issue credentials, etc."""
    context = context or {}
    history_text = "\n".join(
        f"{h.get('role', 'user')}: {h.get('text', '')}" for h in history[-10:]
    )
    prompt = (
        f"Conversation so far:\n{history_text}\n\n"
        f"Current page context: {json.dumps(context, default=str)}\n\n"
        f"User's new message: {message}\n\n"
        "Help the user — guide first-time users around the platform, help institution staff "
        "understand the issuance/approval flow, or explain a concept. Never claim to verify a "
        "certificate yourself: if they ask whether a specific certificate is valid, direct them "
        "to the real Verify page (paste the certificate ID) for an authoritative answer."
    )
    return _ask(prompt, max_tokens=700, effort="medium")


_SUSPICIOUS_SCHEMA = {
    "type": "object",
    "properties": {
        "suspicious": {"type": "boolean"},
        "reasons": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["suspicious", "reasons"],
    "additionalProperties": False,
}


def detect_suspicious_patterns(payload: dict) -> dict:
    """
    Advisory pre-screen run BEFORE the real blockchain verification call.

    This NEVER gates or replaces the real verify() — the caller must run the
    authoritative check regardless of what this returns. It exists only to
    surface a heuristic warning banner alongside the real verdict.
    """
    prompt = (
        "You are pre-screening a document payload a user is about to submit for blockchain "
        "verification. This is a heuristic advisory check only — the real cryptographic "
        "verification happens separately and is authoritative no matter what you say. "
        "Look for suspicious patterns: inconsistent or malformed dates, placeholder-looking "
        "or mismatched names, fields that look tampered or incorrectly copy-pasted, or a "
        "malformed certificate ID. If nothing looks off, say so.\n\n"
        "PAYLOAD:\n" + json.dumps(payload, default=str)
    )
    raw = _ask(prompt, max_tokens=300, effort="low", json_schema=_SUSPICIOUS_SCHEMA)
    try:
        parsed = json.loads(raw)
        return {
            "suspicious": bool(parsed.get("suspicious", False)),
            "reasons": [str(r) for r in parsed.get("reasons", [])][:5],
        }
    except (json.JSONDecodeError, AttributeError):
        # A malformed AI response must never be dressed up as a real finding.
        return {"suspicious": False, "reasons": []}
