"""Resource limits for subprocesses that parse untrusted documents.

Tools like Ghostscript read hostile input and have a long RCE/DoS history. A
`preexec_fn` that sets rlimits on the child before exec caps the blast radius of
a malicious file — runaway CPU and output-size (decompression) bombs —
independently of the tool itself.

Deliberately conservative:
- RLIMIT_CPU and RLIMIT_FSIZE are safe across the board (a legit compress uses
  seconds of CPU and produces output no larger than its input), so they're on by
  default.
- RLIMIT_AS (address space / memory) is OFF by default: JVM-backed or heavily
  memory-mapping tools reserve huge virtual memory and an AS cap breaks them.
  Ghostscript has no JVM, so a hard memory ceiling is safe for IT specifically —
  enable it via GS_RLIMIT_AS_BYTES after testing against your real PDFs. This is
  the calibration knob: tune it to your workload, don't guess it blind.

Unix-only (imports `resource`); the app is Linux-deployed.
"""
import os
import resource

GS_CPU_SECONDS = int(os.environ.get("GS_RLIMIT_CPU_SECONDS", 300))
GS_FSIZE_BYTES = int(os.environ.get("GS_RLIMIT_FSIZE_BYTES", 500 * 1024 * 1024))
GS_AS_BYTES = int(os.environ.get("GS_RLIMIT_AS_BYTES", 0))  # 0 = leave unset


def ghostscript_preexec():
    """Applied in the child (via subprocess preexec_fn) right before Ghostscript
    execs. Caps CPU time and output file size; optionally caps address space."""
    resource.setrlimit(resource.RLIMIT_CPU, (GS_CPU_SECONDS, GS_CPU_SECONDS))
    resource.setrlimit(resource.RLIMIT_FSIZE, (GS_FSIZE_BYTES, GS_FSIZE_BYTES))
    if GS_AS_BYTES > 0:
        resource.setrlimit(resource.RLIMIT_AS, (GS_AS_BYTES, GS_AS_BYTES))
