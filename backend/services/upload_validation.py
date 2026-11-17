"""Lightweight magic-byte checks at the upload boundary.

A first line of defence for endpoints that feed untrusted files into external
binaries with a history of malicious-document CVEs (Ghostscript, LibreOffice,
ImageMagick): confirm the bytes actually look like the expected type before the
binary ever sees them, so a mislabelled or hostile payload is rejected early.

The checks peek the leading bytes and rewind, so they work directly on the
SpooledTemporaryFile behind an UploadFile without consuming it.

Scope: currently only PDF is validated (wired to the Ghostscript compress path).
Full per-endpoint expected-type validation across every route — binary formats
by magic, text formats (CSV/JSON/XML/SVG/EML) by a different rule — is a larger,
regression-sensitive task tracked in the production analysis; do it deliberately
with an expected-type map, not a blanket sniff that would reject valid text.
"""

PDF_MAGIC = b"%PDF-"
# PDFs normally start with %PDF-, but the spec/readers tolerate a little junk
# before it, so scan the first block rather than requiring it at byte 0 — this
# keeps valid-but-unusual PDFs from being falsely rejected.
_PDF_SCAN_BYTES = 1024


class InvalidFileTypeError(ValueError):
    """Raised when an upload's magic bytes don't match the expected type."""


def assert_pdf(fileobj) -> None:
    """Raise InvalidFileTypeError unless `fileobj` looks like a PDF. Rewinds the
    stream to position 0 afterwards so the caller can still read it in full."""
    head = fileobj.read(_PDF_SCAN_BYTES)
    fileobj.seek(0)
    if PDF_MAGIC not in head:
        raise InvalidFileTypeError("File is not a valid PDF (missing %PDF header).")


# EPS is PostScript, which ImageMagick delegates to Ghostscript — the same
# malicious-document RCE surface as PDF, so guard it the same way. Two valid
# forms: ASCII EPS starts with "%!PS", and DOS/binary EPS (with a bundled
# preview) starts with the 4-byte magic C5 D0 D3 C6.
EPS_ASCII_MAGIC = b"%!PS"
EPS_BINARY_MAGIC = b"\xc5\xd0\xd3\xc6"


def assert_eps(fileobj) -> None:
    """Raise InvalidFileTypeError unless `fileobj` looks like an EPS/PostScript
    file. Rewinds the stream to position 0 afterwards."""
    head = fileobj.read(4)
    fileobj.seek(0)
    if head != EPS_BINARY_MAGIC and not head.startswith(EPS_ASCII_MAGIC):
        raise InvalidFileTypeError("File is not a valid EPS (missing PostScript header).")


# Office documents fed to LibreOffice are either OOXML (docx/pptx = a ZIP,
# starting PK\x03\x04) or legacy OLE compound files (doc/ppt/msg, starting with
# the D0CF11E0 magic). Reject anything that's neither before it reaches the
# document parser.
ZIP_MAGIC = b"PK\x03\x04"
OLE_MAGIC = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"


def assert_office(fileobj) -> None:
    """Raise InvalidFileTypeError unless `fileobj` looks like an Office document
    (OOXML/zip or legacy OLE). Rewinds the stream to position 0 afterwards."""
    head = fileobj.read(8)
    fileobj.seek(0)
    if head[:4] != ZIP_MAGIC and head != OLE_MAGIC:
        raise InvalidFileTypeError(
            "File is not a recognised Office document (expected OOXML/zip or legacy OLE)."
        )
