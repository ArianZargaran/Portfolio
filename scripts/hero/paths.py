"""Shared paths for the hero media scripts.

Override with CLI flags (any script) or env vars; defaults match the shared box:

  --brain DIR   / HERO_BRAIN   read-only design source   (default /workspace/portfolio-brain)
  --report DIR  / HERO_REPORT  working + report folder    (default /workspace/hero-encoding-report)

The repo root is derived from this file's location, so the scripts work from any clone.
Flags are stripped from sys.argv, leaving each script's own positional args intact.
"""
import argparse, os, sys

_p = argparse.ArgumentParser(add_help=False)
_p.add_argument("--brain", default=os.environ.get("HERO_BRAIN", "/workspace/portfolio-brain"))
_p.add_argument("--report", default=os.environ.get("HERO_REPORT", "/workspace/hero-encoding-report"))
_args, _rest = _p.parse_known_args(sys.argv[1:])
sys.argv = [sys.argv[0], *_rest]

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
BRAIN = os.path.abspath(_args.brain)
REPORT = os.path.abspath(_args.report)
SRC = f"{REPORT}/work/src"
ENC = f"{REPORT}/work/enc"
