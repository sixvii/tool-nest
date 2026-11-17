import io
import pytest

from services.upload_validation import assert_pdf, assert_eps, assert_office, InvalidFileTypeError


def test_assert_pdf_accepts_valid_pdf_and_rewinds():
    data = b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n... body ..."
    f = io.BytesIO(data)
    assert_pdf(f)                 # must not raise
    assert f.read() == data       # stream rewound to 0, fully readable


def test_assert_pdf_accepts_pdf_with_minor_leading_junk():
    # readers tolerate a little junk before the header; we scan the first block
    f = io.BytesIO(b"\n \x00%PDF-1.4 rest")
    assert_pdf(f)


def test_assert_pdf_rejects_non_pdf():
    f = io.BytesIO(b"GIF89a definitely not a pdf")
    with pytest.raises(InvalidFileTypeError):
        assert_pdf(f)


def test_assert_pdf_rejects_pdf_header_beyond_scan_window():
    # header buried past the 1KB scan window -> treated as not a PDF
    f = io.BytesIO(b"A" * 2000 + b"%PDF-1.4")
    with pytest.raises(InvalidFileTypeError):
        assert_pdf(f)


def test_assert_eps_accepts_ascii_eps_and_rewinds():
    data = b"%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 100 100\n"
    f = io.BytesIO(data)
    assert_eps(f)
    assert f.read() == data


def test_assert_eps_accepts_binary_dos_eps():
    f = io.BytesIO(b"\xc5\xd0\xd3\xc6" + b"\x00" * 20)
    assert_eps(f)


def test_assert_eps_rejects_non_eps():
    f = io.BytesIO(b"\x89PNG\r\n\x1a\n not postscript")
    with pytest.raises(InvalidFileTypeError):
        assert_eps(f)


def test_assert_office_accepts_ooxml_zip_and_rewinds():
    data = b"PK\x03\x04" + b"\x00" * 30  # docx/pptx
    f = io.BytesIO(data)
    assert_office(f)
    assert f.read() == data


def test_assert_office_accepts_legacy_ole():
    f = io.BytesIO(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 30)  # doc/ppt/msg
    assert_office(f)


def test_assert_office_rejects_non_office():
    f = io.BytesIO(b"\x89PNG\r\n\x1a\n not an office doc")
    with pytest.raises(InvalidFileTypeError):
        assert_office(f)
