#!/usr/bin/env python3
"""Create a deterministic source ZIP from one exact Git commit, with evidence."""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

TOP = {"README.md", "AGENTS.md", "LICENSE", ".gitignore", "package.json"}
ROOTS = ("public/", "tests/", "docs/", "scripts/", "prompts/", ".github/")
DENY = re.compile(r"(^|/)(\.env(?:\.|$)|\.git(?:/|$)|node_modules(?:/|$)|.*service.?account.*|.*secret.*|.*private.?key.*|.*credential.*|id_rsa(?:\.|$)|id_ed25519(?:\.|$))", re.I)
MARKERS = [b"-----BEGIN PRIVATE KEY-----", b"-----BEGIN RSA PRIVATE KEY-----", b"-----BEGIN OPENSSH PRIVATE KEY-----"]

def git(*args):
    return subprocess.check_output(["git", *args])

def permitted(name):
    if name.startswith("/") or ".." in name.split("/"):
        return False
    if not (name in TOP or name.startswith(ROOTS)):
        return False
    if DENY.search(name) or name.endswith((".pem", ".p12", ".pfx", ".key")):
        return False
    return name not in {
        ".github/workflows/gemini-audit-bundle.yml",
        "scripts/build-gemini-audit-bundle.py",
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sha", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--evidence", default="audit-evidence")
    args = parser.parse_args()
    sha = git("rev-parse", "--verify", args.sha + "^{commit}").decode().strip()
    if sha != args.sha:
        raise SystemExit("Expected full immutable SHA")
    names = git("ls-tree", "-r", "--name-only", sha).decode().splitlines()
    files = {}
    for name in names:
        if not permitted(name):
            continue
        data = git("show", sha + ":" + name)
        if any(marker in data for marker in MARKERS):
            raise SystemExit("Refusing archive containing private key: " + name)
        files[name] = data
    if not files or "README.md" not in files or "package.json" not in files:
        raise SystemExit("Unexpectedly incomplete checkout")
    missing = [p for p in ("firebase.json", "database.rules.json") if p not in files]
    manifest = {
        "source_repository": "Lucas-Sperotto/fluencircle-website",
        "source_sha": sha,
        "source_count": len(files),
        "source_files_sha256": {
            name: hashlib.sha256(data).hexdigest()
            for name, data in sorted(files.items())
        },
        "missing_root_config": missing,
        "warning": "Firebase proposals in docs/ are NOT verified active rules; no Emulator or Render was tested.",
    }
    files["EVIDENCIAS/MANIFESTO.json"] = json.dumps(manifest, ensure_ascii=False, indent=2).encode()
    files["LEIA-ME-GEMINI.md"] = (
        "# FluenCircle - pacote para auditoria independente\n\n"
        + "Commit exato da main: " + sha + "\n\n"
        + "Codigo, docs, PDF, scripts, testes e logs de CI offline sao inclusos.\n"
        + "Arquivos root firebase.json e database.rules.json nao constam nesta versao.\n"
        + "docs/firebase/database.rules.proposta.json e apenas proposta, NAO regra ativa.\n"
        + "Nao invente execucoes de Emulator/Render, login ou E2E.\n"
        + "Revise os pareceres anteriores criticamente e cite caminho e trecho de cada achado.\n"
        + "Registre propostas no fork, branch audit/gemini-revisao, sem merge ou deploy automaticos.\n"
    ).encode("utf-8")
    folder = Path(args.evidence)
    if folder.is_dir():
        for item in sorted(folder.iterdir()):
            if item.is_file():
                files["EVIDENCIAS/" + item.name] = item.read_bytes()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, "w") as archive:
        for name, data in sorted(files.items()):
            entry = ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            entry.compress_type = ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            archive.writestr(entry, data, compress_type=ZIP_DEFLATED, compresslevel=9)
    print("SOURCE_SHA=" + sha)
    print("SOURCE_FILES=" + str(manifest["source_count"]))
    print("MISSING_CONFIG=" + ", ".join(missing))
    print("ARCHIVE_SHA256=" + hashlib.sha256(output.read_bytes()).hexdigest())
    print("ARCHIVE_PATH=" + str(output))

if __name__ == "__main__":
    main()
