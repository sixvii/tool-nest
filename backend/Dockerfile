FROM python:3.11-slim-bookworm

RUN useradd -m appuser
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    -o Acquire::Retries=3 \
    ffmpeg libreoffice ghostscript poppler-utils default-jre \
    calibre libemail-outlook-message-perl tesseract-ocr tesseract-ocr-eng imagemagick exiftool \
    python3-uno python3-pip \
    && rm -rf /var/lib/apt/lists/*

# ImageMagick coder policy (Ghostscript-delegate RCE surface control).
# The distro policy.xml denies the whole PS/EPS/PDF/XPS coder family by default.
# This app DOES use IM for EPS<->raster (convert_image_magick: eps-to-png/jpg/svg,
# png-to-eps) — those need the EPS coder, and EPS renders through the PS coder —
# so we scope the re-enable to EXACTLY {PS, EPS} at read|write and leave
# PDF / PS2 / PS3 / XPS at rights="none" (the app never rasterises PDF through
# IM; that stays a closed RCE surface). The greps make the build FAIL LOUDLY if
# a future base-image policy.xml changes shape — a silent sed no-op is what
# previously shipped EPS broken (all 4 endpoints 500'd, invisible to the unit
# suite because no test drives a real `convert`). EPS input is already guarded
# by assert_eps (magic-byte) + GS rlimits + gs -dSAFER.
RUN set -e; pol=/etc/ImageMagick-6/policy.xml; \
    grep -q 'rights="none" pattern="EPS"' "$pol"; \
    grep -q 'rights="none" pattern="PS"' "$pol"; \
    sed -i -e 's/rights="none" pattern="EPS"/rights="read|write" pattern="EPS"/' \
           -e 's/rights="none" pattern="PS"/rights="read|write" pattern="PS"/' "$pol"; \
    grep -q 'rights="read|write" pattern="EPS"' "$pol"; \
    grep -q 'rights="read|write" pattern="PS"' "$pol"; \
    grep -q 'rights="none" pattern="PDF"' "$pol"

COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

RUN /usr/bin/python3 -m pip install unoserver --break-system-packages

RUN playwright install-deps
RUN chown -R appuser:appuser /app
USER appuser
RUN playwright install chromium
COPY --chown=appuser:appuser . .
EXPOSE 8000
CMD ["bash", "start.sh"]
