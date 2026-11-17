import os
import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock

from services.web_service import convert_url_to_pdf, assert_public_url, UnsafeURLError


# --- SSRF guard (assert_public_url) --------------------------------------
# IP literals keep getaddrinfo network-free; it returns the literal as-is.

@pytest.mark.parametrize("url", [
    "http://127.0.0.1/",                        # loopback
    "http://169.254.169.254/latest/meta-data/",  # cloud metadata (link-local)
    "http://10.0.0.5/",                         # private class A
    "http://192.168.0.10/",                     # private class C
    "http://172.16.5.5/",                       # private class B
    "http://[::1]/",                            # IPv6 loopback
    "http://[::ffff:127.0.0.1]/",               # IPv4-mapped IPv6 loopback
    "http://0.0.0.0/",                          # unspecified
])
def test_assert_public_url_rejects_internal(url):
    with pytest.raises(UnsafeURLError):
        assert_public_url(url)


@pytest.mark.parametrize("url", [
    "http://8.8.8.8/",                          # public (literal, no DNS)
    "https://1.1.1.1/",                         # public
])
def test_assert_public_url_allows_public(url):
    assert_public_url(url)  # should not raise


def test_assert_public_url_unresolvable_host_rejected():
    with pytest.raises(UnsafeURLError):
        assert_public_url("http://this-host-should-not-exist.invalid/")


@patch('services.web_service.async_playwright')
def test_convert_url_to_pdf_success(mock_async_playwright):
    # Create mock objects for the Playwright API
    mock_playwright = MagicMock()
    mock_browser = AsyncMock()
    mock_page = AsyncMock()
    
    # Wire up the async methods
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)
    mock_browser.new_page = AsyncMock(return_value=mock_page)
    mock_page.goto = AsyncMock()
    mock_page.pdf = AsyncMock()
    mock_browser.close = AsyncMock()
    
    # Setup the async context manager returned by async_playwright()
    mock_context = AsyncMock()
    mock_context.__aenter__.return_value = mock_playwright
    mock_async_playwright.return_value = mock_context
    
    temp_dir = "/tmp/dummy_dir"
    url = "https://example.com"
    
    out_path = asyncio.run(convert_url_to_pdf(url, temp_dir))
    
    assert out_path == os.path.join(temp_dir, "website.pdf")
    
    mock_async_playwright.assert_called_once()
    mock_playwright.chromium.launch.assert_called_once_with(headless=True)
    mock_browser.new_page.assert_called_once()
    mock_page.goto.assert_called_once_with(url, wait_until="networkidle")
    mock_page.pdf.assert_called_once_with(path=out_path)
    mock_browser.close.assert_called_once()


@patch('services.web_service.gc')
@patch('services.web_service.async_playwright')
def test_convert_url_to_pdf_exception_cleanup(mock_async_playwright, mock_gc):
    mock_playwright = MagicMock()
    mock_browser = AsyncMock()
    mock_page = AsyncMock()
    
    mock_playwright.chromium.launch = AsyncMock(return_value=mock_browser)
    mock_browser.new_page = AsyncMock(return_value=mock_page)
    mock_page.goto = AsyncMock(side_effect=Exception("Failed to load page"))
    
    mock_context = AsyncMock()
    mock_context.__aenter__.return_value = mock_playwright
    mock_async_playwright.return_value = mock_context
    
    temp_dir = "/tmp/dummy_dir"
    url = "https://badurl.com"
    
    # Verify that the exception propagates upward
    with pytest.raises(Exception, match="Failed to load page"):
        asyncio.run(convert_url_to_pdf(url, temp_dir))
        
    mock_page.goto.assert_called_once_with(url, wait_until="networkidle")
    mock_page.pdf.assert_not_called()
    
    # Verify that gc.collect() runs in the finally block despite the exception
    mock_gc.collect.assert_called_once()