import os
import gc
import socket
import ipaddress
from urllib.parse import urlsplit

from playwright.async_api import async_playwright


class UnsafeURLError(ValueError):
    """Raised when a user-supplied URL targets a non-public address (SSRF guard)."""


def _ip_is_public(ip_str: str) -> bool:
    """True only for globally-routable unicast addresses. Rejects loopback,
    private, link-local (incl. cloud metadata 169.254.169.254), reserved,
    multicast and unspecified ranges, for both IPv4 and IPv6 (including
    IPv4-mapped IPv6 like ::ffff:127.0.0.1)."""
    ip = ipaddress.ip_address(ip_str)
    if getattr(ip, "ipv4_mapped", None) is not None:
        ip = ip.ipv4_mapped
    return not (
        ip.is_private or ip.is_loopback or ip.is_link_local
        or ip.is_reserved or ip.is_multicast or ip.is_unspecified
    )


def assert_public_url(url: str) -> None:
    """SSRF guard. Resolves the URL's host and raises UnsafeURLError unless
    every resolved address is a public unicast IP. Call this BEFORE handing a
    user-supplied URL to the browser.

    Scheme is already constrained to http/https upstream by pydantic HttpUrl,
    so this only closes the target-address hole that URL-format validation
    leaves open.

    ponytail: resolve-then-check has a DNS-rebind TOCTOU window — Playwright
    re-resolves the host itself at fetch time, so a hostile resolver could
    return a public IP here and a private one there. Closing it fully means
    pinning the resolved IP and forcing the browser to connect to it with the
    original Host header (a much larger change to the fetch path). Acceptable
    ceiling for an on-prem/containerised conversion tool; revisit if this ever
    serves untrusted callers over the open internet."""
    host = (urlsplit(url).hostname or "").strip()
    if not host:
        raise UnsafeURLError("URL has no host.")

    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as e:
        raise UnsafeURLError(f"Could not resolve host '{host}'.") from e

    resolved = {info[4][0] for info in infos}
    if not resolved:
        raise UnsafeURLError(f"Could not resolve host '{host}'.")

    for ip_str in resolved:
        if not _ip_is_public(ip_str):
            raise UnsafeURLError(
                f"URL host '{host}' resolves to a non-public address ({ip_str}) and is not allowed."
            )


async def convert_url_to_pdf(url: str, temp_dir: str) -> str:
    pdf_path = os.path.join(temp_dir, "website.pdf")
    
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle")
            await page.pdf(path=pdf_path)
            await browser.close()
        return pdf_path
    finally:
        gc.collect()