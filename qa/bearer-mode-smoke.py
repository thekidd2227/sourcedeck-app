#!/usr/bin/env python3
"""End-to-end bearer-mode auth smoke for SourceDeck ↔ ChartNav.

Stands up:
  1. A localhost JWKS server (serves a single RSA public key under /jwks.json).
  2. Mints an RS256 JWT for admin@chartnav.local with the correct iss/aud.
  3. Writes the token to qa/bearer-token.txt so the SourceDeck integration
     can be driven separately (Node harness consumes the token as the
     admin_token field — the integration sends it as Authorization: Bearer).

Caller is responsible for booting ChartNav with:
   CHARTNAV_AUTH_MODE=bearer
   CHARTNAV_JWT_ISSUER=https://qa-issuer.local/
   CHARTNAV_JWT_AUDIENCE=chartnav-api
   CHARTNAV_JWT_JWKS_URL=http://127.0.0.1:9233/jwks.json

Exits cleanly after writing the token + leaving the JWKS server running
in the background. The JWKS server is needed for the lifetime of any
SourceDeck request (PyJWKClient may re-fetch on cache miss / kid drift).
Use SIGTERM to stop.
"""
from __future__ import annotations
import base64
import json
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

ISSUER = os.environ.get("ISS", "https://qa-issuer.local/")
AUDIENCE = os.environ.get("AUD", "chartnav-api")
SUBJECT_EMAIL = os.environ.get("SUB", "admin@chartnav.local")
JWKS_PORT = int(os.environ.get("JWKS_PORT", "9233"))
TTL_SECONDS = int(os.environ.get("TTL", "3600"))
KID = "qa-kid-1"

# Generate keypair
priv = rsa.generate_private_key(public_exponent=65537, key_size=2048)
priv_pem = priv.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.TraditionalOpenSSL,
    encryption_algorithm=serialization.NoEncryption(),
)
pub_numbers = priv.public_key().public_numbers()


def _b64url_uint(v: int) -> str:
    b = v.to_bytes((v.bit_length() + 7) // 8, "big") or b"\x00"
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


JWKS = {
    "keys": [
        {
            "kty": "RSA",
            "use": "sig",
            "kid": KID,
            "alg": "RS256",
            "n": _b64url_uint(pub_numbers.n),
            "e": _b64url_uint(pub_numbers.e),
        }
    ]
}

# Mint token
now = int(time.time())
token = jwt.encode(
    {
        "iss": ISSUER,
        "aud": AUDIENCE,
        "iat": now,
        "exp": now + TTL_SECONDS,
        "email": SUBJECT_EMAIL,
    },
    priv_pem,
    algorithm="RS256",
    headers={"kid": KID},
)

# Save token + config for the Node-side smoke
out_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(out_dir, "bearer-token.txt"), "w") as f:
    f.write(token)
with open(os.path.join(out_dir, "bearer-config.json"), "w") as f:
    json.dump(
        {
            "issuer": ISSUER,
            "audience": AUDIENCE,
            "jwks_url": f"http://127.0.0.1:{JWKS_PORT}/jwks.json",
            "user_claim": "email",
            "subject_email": SUBJECT_EMAIL,
            "kid": KID,
            "ttl_seconds": TTL_SECONDS,
        },
        f,
        indent=2,
    )

print(f"[bearer-smoke] minted JWT for {SUBJECT_EMAIL} (kid={KID}, ttl={TTL_SECONDS}s)")
print(f"[bearer-smoke] JWKS URL = http://127.0.0.1:{JWKS_PORT}/jwks.json")


class JWKSHandler(BaseHTTPRequestHandler):
    def log_message(self, *_args, **_kwargs):  # quiet
        pass

    def do_GET(self):
        if self.path != "/jwks.json":
            self.send_response(404)
            self.end_headers()
            return
        body = json.dumps(JWKS).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


server = ThreadingHTTPServer(("127.0.0.1", JWKS_PORT), JWKSHandler)
print(f"[bearer-smoke] JWKS server listening on 127.0.0.1:{JWKS_PORT} (Ctrl-C to stop)")
sys.stdout.flush()
try:
    server.serve_forever()
except KeyboardInterrupt:
    print("[bearer-smoke] shutting down")
    server.shutdown()
