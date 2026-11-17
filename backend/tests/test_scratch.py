"""
Tests for the process-wide temp redirect (services/scratch.py) and the Beat
sweep's coverage of the scratch dir (services.tasks.cleanup_stale_files).

Together these close the bare-/tmp temp-leak class: any tempfile created without
an explicit dir= now lands in SCRATCH_DIR, and the sweep reclaims stale ones —
so a synchronous service that raises after mkstemp() but before the router can
register a cleanup no longer leaks forever.
"""
import os
import time
import tempfile

from services.scratch import SCRATCH_DIR
from services import tasks


def test_tempfile_is_redirected_to_scratch():
    """Importing services.scratch must have pointed tempfile at SCRATCH_DIR."""
    assert tempfile.gettempdir() == SCRATCH_DIR
    assert os.path.isdir(SCRATCH_DIR)


def test_unqualified_mkstemp_lands_in_scratch():
    fd, path = tempfile.mkstemp(suffix=".probe")
    os.close(fd)
    try:
        assert os.path.dirname(path) == SCRATCH_DIR
    finally:
        os.remove(path)


def test_unqualified_mkdtemp_lands_in_scratch():
    d = tempfile.mkdtemp()
    try:
        assert os.path.dirname(d) == SCRATCH_DIR
    finally:
        os.rmdir(d)


def test_cleanup_sweeps_stale_scratch_files_but_keeps_fresh():
    # a stale stray (mtime well past the TTL) and a fresh one
    stale_fd, stale = tempfile.mkstemp(suffix=".stale", dir=SCRATCH_DIR)
    os.close(stale_fd)
    old = time.time() - (tasks.FILE_TTL_SECONDS + 3600)
    os.utime(stale, (old, old))

    fresh_fd, fresh = tempfile.mkstemp(suffix=".fresh", dir=SCRATCH_DIR)
    os.close(fresh_fd)

    try:
        result = tasks.cleanup_stale_files()

        assert not os.path.exists(stale), "stale scratch file should have been swept"
        assert os.path.exists(fresh), "fresh scratch file must be kept (still in use)"
        assert result["removed_scratch"] >= 1
    finally:
        for p in (stale, fresh):
            if os.path.exists(p):
                os.remove(p)
