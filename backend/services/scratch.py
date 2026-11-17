"""Process-wide temp-file redirect + shared cleanup target.

Importing this module (for its side effect) points Python's ``tempfile`` at
``SCRATCH_DIR``, so every ``tempfile.mkstemp()`` / ``mkdtemp()`` call that does
NOT pass an explicit ``dir=`` lands in one known, swept location instead of
scattering across the system temp dir.

Why this exists
---------------
The synchronous conversion services build their output via
``tempfile.mkstemp()`` and rely on the router's ``BackgroundTasks`` to delete
it after the response is sent. If a conversion raises *after* ``mkstemp`` but
*before* returning the path, that temp file orphans — the router never
registered a cleanup for a path it never received. The Beat-scheduled sweep
(``services.tasks.cleanup_stale_files``) historically only walked the upload
and output dirs, so those bare-temp orphans were never reclaimed.

Funnelling every unqualified temp file into ``SCRATCH_DIR``, and adding that
dir to the sweep, means any such stray is reclaimed within the TTL instead of
never — with no per-call-site edits and no way for future code to opt out by
forgetting a helper.

Deliberate global
-----------------
``tempfile.tempdir`` is a module-global set once here. Third-party libraries'
unqualified temp files also land in ``SCRATCH_DIR``; they clean up their own,
and anything they leak is swept after the TTL (every conversion times out well
under it — 10 min vs. the 1 h default TTL, so a file old enough to sweep is
never one still in use).

Wiring
------
Imported at process start by ``main.py`` (API) and ``celery_app.py`` (Celery
workers). Both share the ``/tmp`` volume in docker-compose, so the worker's
Beat sweep can reclaim strays written by the API process.
"""
import os
import tempfile

SCRATCH_DIR = "/tmp/tool-nest-scratch"

os.makedirs(SCRATCH_DIR, exist_ok=True)
tempfile.tempdir = SCRATCH_DIR
