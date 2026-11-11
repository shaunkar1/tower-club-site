#!/usr/bin/env python3
"""Assemble the static site.

Each page body lives in src/pages/<name>.html and starts with a meta comment:
    <!--meta {"title": "History", "description": "...", "next": "house"} -->
The shared header, footer and page shell live in src/partials/.

    python3 build.py      # writes ./<name>.html for every page
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"

# slug -> (nav label, file). Order here is the order in the nav.
PAGES = {
    "index": ("Home", "index.html"),
    "history": ("History", "history.html"),
    "125": ("125 Years", "125.html"),
    "house": ("The House", "house.html"),
    "leadership": ("Leadership", "leadership.html"),
    "alumni": ("Alumni", "alumni.html"),
    "members": ("Members", "members.html"),
    "join": ("Join Tower", "join.html"),
}
NAV = ["history", "125", "house", "leadership", "alumni", "members"]

META_RE = re.compile(r"^\s*<!--meta\s+(\{.*?\})\s*-->\s*", re.S)


def partial(name):
    return (SRC / "partials" / f"{name}.html").read_text()


def nav_links(active):
    out = []
    for slug in NAV:
        label, href = PAGES[slug]
        cls = ' class="is-active" aria-current="page"' if slug == active else ""
        dot = '<i class="nav__dot" aria-hidden="true"></i>' if slug == "125" else ""
        out.append(f'<a href="{href}"{cls} data-scramble>{label}{dot}</a>')
    return "\n      ".join(out)


def menu_links(active):
    out = []
    for i, slug in enumerate(["index", *NAV, "join"], 1):
        label, href = PAGES[slug]
        cls = ' class="is-active"' if slug == active else ""
        out.append(f'<a href="{href}"{cls}><i>{i:02d}</i>{label}</a>')
    return "\n    ".join(out)


def next_page(slug):
    if not slug:
        return ""
    label, href = PAGES[slug]
    return f"""
  <a class="next-page" href="{href}">
    <span class="next-page__eyebrow">Next page</span>
    <span class="next-page__title"><span>{label}</span><span class="next-page__arrow" aria-hidden="true">→</span></span>
  </a>"""


def build():
    shell = partial("shell")
    header, footer = partial("header"), partial("footer")
    for slug, (label, href) in PAGES.items():
        raw = (SRC / "pages" / href).read_text()
        m = META_RE.match(raw)
        meta = json.loads(m.group(1)) if m else {}
        body = raw[m.end():] if m else raw
        title = meta.get("title", label)
        page = (
            shell.replace("{{header}}", header)
            .replace("{{footer}}", footer)
            .replace("{{content}}", body.strip())
            .replace("{{next}}", next_page(meta.get("next")))
            .replace("{{nav}}", nav_links(slug))
            .replace("{{menu}}", menu_links(slug))
            .replace("{{title}}", "Princeton Tower Club" if slug == "index" else f"{title} · Princeton Tower Club")
            .replace("{{description}}", meta.get("description", "Princeton Tower Club, 13 Prospect Avenue. Est. 1902."))
            .replace("{{slug}}", slug)
            .replace("{{label}}", label)
        )
        (ROOT / href).write_text(page)
        print(f"built {href}")


if __name__ == "__main__":
    build()
