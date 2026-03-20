#!/usr/bin/env python3
"""Resume PDF generator and validator.

Reads src/docs/resume.md (golden dataset) and generates an ATS-optimized
single-page PDF using fpdf2. All styling defined as constants in this
script. No CSS or YAML config consumed.

Usage:
    python3 scripts/resume_pdf.py --output Thomas_To_Resume_MLE
    python3 scripts/resume_pdf.py --validate-only
"""

import argparse
import re
import sys
from pathlib import Path

from fpdf import FPDF


# ── Project Paths ─────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_INPUT = PROJECT_ROOT / "src" / "docs" / "resume.md"
DEFAULT_OUTPUT_NAME = "Thomas_To_Resume"


# ── Layout Constants ──────────────────────────────────────────────────
PAGE_FORMAT = "Letter"
PAGE_WIDTH = 8.5   # inches
PAGE_HEIGHT = 11.0
MARGIN_TOP = 0.4
MARGIN_BOTTOM = 0.4
MARGIN_LEFT = 0.5
MARGIN_RIGHT = 0.5
CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

FONT_FAMILY = "Times"
FONT_SIZE_H1 = 20
FONT_SIZE_H2 = 11
FONT_SIZE_CONTACT = 10
FONT_SIZE_BODY = 10.5
LINE_HEIGHT_MULT = 1.25

LINK_COLOR = (17, 85, 204)
BULLET_CHAR = "-"
BULLET_INDENT = 0.2   # inches from left margin
BULLET_HANG = 0.15    # hanging indent for wrapped lines

H1_SPACE_AFTER = 2 / 72
CONTACT_SPACE_AFTER = 0 / 72
H2_SPACE_BEFORE = 6 / 72
H2_SPACE_AFTER = 3 / 72
H2_RULE_WEIGHT = 1.5 / 72
PARAGRAPH_SPACE_BEFORE = 3 / 72
BULLET_SPACE = 1 / 72
ENTRY_SPACE_BEFORE = 2 / 72


# ── ATS Required Sections ────────────────────────────────────────────
ATS_SECTIONS = {
    "PROFESSIONAL SUMMARY",
    "TECHNICAL SKILLS",
    "PROFESSIONAL EXPERIENCE",
    "EDUCATION",
}


# ── Banned Words (from boilerplate_humanoid_speech.md) ────────────────
BANNED_WORDS = [
    "can", "may", "just", "that", "very", "really", "literally",
    "actually", "certainly", "probably", "basically", "could", "maybe",
    "delve", "embark", "enlightening", "esteemed", "shed light", "craft",
    "curating", "imagine", "realm", "game-changer", "unlock", "discover",
    "skyrocket", "abyss", "not alone", "in a world where", "revolutionize",
    "disruptive", "utilize", "utilizing", "dive deep", "tapestry",
    "illuminate", "unveil", "pivotal", "intricate", "elucidate", "hence",
    "furthermore", "however", "harness", "exciting", "groundbreaking",
    "cutting-edge", "remarkable", "it remains to be seen", "glimpse into",
    "navigating", "landscape", "stark", "testament", "in summary",
    "in conclusion", "moreover", "boost", "skyrocketing", "opened up",
    "powerful", "inquiries", "ever-evolving",
]


# ── Parsing ───────────────────────────────────────────────────────────

def strip_frontmatter(text):
    """Remove YAML frontmatter (--- ... ---) if present."""
    if text.startswith("---"):
        end = text.find("---", 3)
        if end != -1:
            return text[end + 3:].lstrip("\n")
    return text


def parse_inline(text):
    """Parse inline markdown into (type, content, url) segments.

    Handles **bold**, *italic*, and [text](url) links.
    """
    segments = []
    pattern = r"(\*\*(.+?)\*\*|\*([^*]+?)\*|\[([^\]]+?)\]\(([^)]+?)\))"
    last_end = 0
    for m in re.finditer(pattern, text):
        if m.start() > last_end:
            segments.append(("plain", text[last_end:m.start()], None))
        if m.group(2) is not None:
            segments.append(("bold", m.group(2), None))
        elif m.group(3) is not None:
            segments.append(("italic", m.group(3), None))
        elif m.group(4) is not None:
            segments.append(("link", m.group(4), m.group(5)))
        last_end = m.end()
    if last_end < len(text):
        segments.append(("plain", text[last_end:], None))
    return segments


def parse_resume(text):
    """Parse resume markdown into structured (type, content) elements."""
    elements = []
    prev_type = None
    for raw_line in text.split("\n"):
        line = raw_line.strip().replace("<br>", "")
        if not line:
            continue
        if line.startswith("# "):
            elements.append(("h1", line[2:]))
            prev_type = "h1"
        elif line.startswith("## "):
            elements.append(("h2", line[3:]))
            prev_type = "h2"
        elif line.startswith("- "):
            elements.append(("bullet", line[2:]))
            prev_type = "bullet"
        elif prev_type == "h1":
            elements.append(("contact", line))
            prev_type = "contact"
        elif line.startswith("**") and "|" in line:
            elements.append(("entry_header", line))
            prev_type = "entry_header"
        else:
            elements.append(("paragraph", line))
            prev_type = "paragraph"
    return elements


# ── Rendering ─────────────────────────────────────────────────────────

def line_h(font_size):
    """Line height in inches for a given font size in points."""
    return font_size * LINE_HEIGHT_MULT / 72


def sanitize(text):
    """Replace Unicode characters unsupported by standard PDF fonts."""
    return text.replace("\u2013", "-").replace("\u2014", "-").replace("\u2022", "-")


def render_text(pdf, text, h):
    """Render text with inline bold, italic, and link formatting via write()."""
    segments = parse_inline(sanitize(text))
    base_size = pdf.font_size_pt
    for seg_type, content, url in segments:
        if seg_type == "bold":
            pdf.set_font(FONT_FAMILY, "B", base_size)
            pdf.write(h, content)
            pdf.set_font(FONT_FAMILY, "", base_size)
        elif seg_type == "italic":
            pdf.set_font(FONT_FAMILY, "I", base_size)
            pdf.write(h, content)
            pdf.set_font(FONT_FAMILY, "", base_size)
        elif seg_type == "link":
            pdf.set_text_color(*LINK_COLOR)
            pdf.write(h, content, url)
            pdf.set_text_color(0, 0, 0)
        else:
            pdf.write(h, content)


def render_h1(pdf, text):
    """Render H1: centered name, 20pt bold."""
    pdf.set_font(FONT_FAMILY, "B", FONT_SIZE_H1)
    h = line_h(FONT_SIZE_H1)
    pdf.cell(CONTENT_WIDTH, h, sanitize(text), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_y(pdf.get_y() + H1_SPACE_AFTER)


def render_contact(pdf, text):
    """Render contact line: centered, 10pt, with clickable links."""
    pdf.set_font(FONT_FAMILY, "", FONT_SIZE_CONTACT)
    h = line_h(FONT_SIZE_CONTACT)
    plain = re.sub(r"\[([^\]]+?)\]\([^)]+?\)", r"\1", text)
    total_w = pdf.get_string_width(plain)
    start_x = max(MARGIN_LEFT, (PAGE_WIDTH - total_w) / 2)
    pdf.set_x(start_x)
    render_text(pdf, text, h)
    pdf.ln(h + CONTACT_SPACE_AFTER)


def render_h2(pdf, text):
    """Render H2: uppercase bold 11pt with bottom rule line."""
    pdf.set_y(pdf.get_y() + H2_SPACE_BEFORE)
    pdf.set_font(FONT_FAMILY, "B", FONT_SIZE_H2)
    h = line_h(FONT_SIZE_H2)
    pdf.cell(CONTENT_WIDTH, h, sanitize(text).upper(), new_x="LMARGIN", new_y="NEXT")
    y_rule = pdf.get_y() + H2_RULE_WEIGHT / 2
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(H2_RULE_WEIGHT)
    pdf.line(MARGIN_LEFT, y_rule, PAGE_WIDTH - MARGIN_RIGHT, y_rule)
    pdf.set_y(y_rule + H2_SPACE_AFTER)


def render_paragraph(pdf, text):
    """Render body paragraph with inline formatting."""
    pdf.set_y(pdf.get_y() + PARAGRAPH_SPACE_BEFORE)
    pdf.set_font(FONT_FAMILY, "", FONT_SIZE_BODY)
    h = line_h(FONT_SIZE_BODY)
    render_text(pdf, text, h)
    pdf.ln(h)


def render_entry_header(pdf, text):
    """Render job/education entry header (bold title, italic date)."""
    pdf.set_y(pdf.get_y() + ENTRY_SPACE_BEFORE)
    pdf.set_font(FONT_FAMILY, "", FONT_SIZE_BODY)
    h = line_h(FONT_SIZE_BODY)
    render_text(pdf, text, h)
    pdf.ln(h)


def render_bullet(pdf, text):
    """Render bullet point with hanging indent for wrapped lines."""
    h = line_h(FONT_SIZE_BODY)
    x_bullet = MARGIN_LEFT + BULLET_INDENT
    x_text = x_bullet + BULLET_HANG

    orig_margin = pdf.l_margin
    pdf.set_left_margin(x_text)

    y = pdf.get_y() + BULLET_SPACE
    pdf.set_font(FONT_FAMILY, "", FONT_SIZE_BODY)
    pdf.set_xy(x_bullet, y)
    pdf.cell(BULLET_HANG, h, BULLET_CHAR)

    pdf.set_xy(x_text, y)
    render_text(pdf, text, h)
    pdf.ln(h)

    pdf.set_left_margin(orig_margin)


# ── PDF Generation ────────────────────────────────────────────────────

def generate_pdf(elements, output_path):
    """Generate PDF from parsed resume elements.

    Returns:
        tuple: (success: bool, page_count: int)
    """
    pdf = FPDF(orientation="P", unit="in", format=PAGE_FORMAT)
    pdf.set_margins(MARGIN_LEFT, MARGIN_TOP, MARGIN_RIGHT)
    pdf.set_auto_page_break(auto=True, margin=MARGIN_BOTTOM)
    pdf.add_page()

    for elem_type, content in elements:
        if elem_type == "h1":
            render_h1(pdf, content)
        elif elem_type == "contact":
            render_contact(pdf, content)
        elif elem_type == "h2":
            render_h2(pdf, content)
        elif elem_type == "paragraph":
            render_paragraph(pdf, content)
        elif elem_type == "entry_header":
            render_entry_header(pdf, content)
        elif elem_type == "bullet":
            render_bullet(pdf, content)

    page_count = pdf.page
    pdf.output(str(output_path))
    return True, page_count


# ── Validation ────────────────────────────────────────────────────────

def validate(text):
    """Run all validation checks on resume markdown content.

    Returns:
        tuple: (issues: list of (level, message), char_count: int)
    """
    issues = []
    body = strip_frontmatter(text)

    # 1. Banned words (WARN for generation, actionable for tailoring)
    body_lower = body.lower()
    for word in BANNED_WORDS:
        pattern = r"\b" + re.escape(word) + r"\b"
        matches = re.findall(pattern, body_lower)
        if matches:
            issues.append(("WARN", f"Banned word: '{word}' ({len(matches)}x)"))

    # 2. Passive voice
    passive_patterns = [
        r"\bwas\s+\w+ed\b", r"\bwere\s+\w+ed\b",
        r"\bbeen\s+\w+ed\b", r"\bbeing\s+\w+ed\b",
    ]
    for pat in passive_patterns:
        for m in re.finditer(pat, body_lower):
            issues.append(("FAIL", f"Passive voice: '{m.group()}'"))

    # 3. Em dashes and double hyphens (en dashes in date ranges are standard)
    if "\u2014" in body:
        issues.append(("FAIL", "Em dash (\u2014) found"))
    if "--" in body:
        issues.append(("FAIL", "Double hyphen (--) found"))

    # 4. Semicolons (exclude URLs)
    for line in body.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        no_urls = re.sub(r"https?://[^\s)]+", "", stripped)
        if ";" in no_urls:
            issues.append(("FAIL", f"Semicolon: '{stripped[:60]}...'"))

    # 5. Character budget (visible text only)
    plain = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", body)
    plain = re.sub(r"[*#\-|]", "", plain)
    plain = re.sub(r"<br>", "", plain)
    visible = re.sub(r"\s+", " ", plain).strip()
    char_count = len(visible)
    if char_count < 3500:
        issues.append(("WARN", f"Under budget: {char_count} chars (target 3500-4000)"))
    elif char_count > 4000:
        issues.append(("WARN", f"Over budget: {char_count} chars (target 3500-4000)"))
    else:
        issues.append(("PASS", f"Character count: {char_count} (target 3500-4000)"))

    # 6. ATS section headers
    found = set(re.findall(r"^## (.+)$", body, re.MULTILINE))
    missing = ATS_SECTIONS - found
    extra = found - ATS_SECTIONS
    if missing:
        issues.append(("FAIL", f"Missing ATS sections: {', '.join(sorted(missing))}"))
    if extra:
        issues.append(("WARN", f"Non-standard sections: {', '.join(sorted(extra))}"))
    if not missing and not extra:
        issues.append(("PASS", "ATS sections valid"))

    # 7. XYZ bullet quality (warn on missing metrics)
    bullets = re.findall(r"^- (.+)$", body, re.MULTILINE)
    metric_re = r"\d+[%$kKmM]|\$[\d,.]+|\d+\+?\s*(?:years?|months?|min|hours?|days?|x\b)|by \d+"
    weak = [b[:60] for b in bullets if not re.search(metric_re, b)]
    if weak:
        issues.append(("WARN", f"{len(weak)} bullets lack metrics (XYZ Y-component):"))
        for w in weak[:5]:
            issues.append(("WARN", f"  - {w}..."))

    # 8. Link validity
    for display, url in re.findall(r"\[([^\]]+)\]\(([^)]*)\)", body):
        if not url:
            issues.append(("FAIL", f"Empty URL for link '{display}'"))

    return issues, char_count


# ── CLI ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Resume PDF generator and validator")
    parser.add_argument(
        "--input", type=Path, default=DEFAULT_INPUT,
        help="Resume markdown file (default: src/docs/resume.md)",
    )
    parser.add_argument(
        "--output", type=str, default=DEFAULT_OUTPUT_NAME,
        help="Output PDF name without .pdf extension (default: Thomas_To_Resume)",
    )
    parser.add_argument(
        "--validate-only", action="store_true",
        help="Run validation without generating PDF",
    )
    args = parser.parse_args()

    input_path = args.input if args.input.is_absolute() else PROJECT_ROOT / args.input
    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    raw_text = input_path.read_text(encoding="utf-8")
    body = strip_frontmatter(raw_text)

    # Validate
    issues, char_count = validate(raw_text)
    has_fail = any(level == "FAIL" for level, _ in issues)

    print("=" * 60)
    print("RESUME VALIDATION REPORT")
    print("=" * 60)
    for level, msg in issues:
        icon = {"PASS": "+", "WARN": "!", "FAIL": "x"}[level]
        print(f"  [{icon}] {level}: {msg}")
    print("=" * 60)

    if args.validate_only:
        sys.exit(1 if has_fail else 0)

    if has_fail:
        print("\nValidation failures found. Fix before generating PDF.", file=sys.stderr)
        sys.exit(1)

    # Generate PDF
    elements = parse_resume(body)
    output_name = args.output.replace(".pdf", "")
    output_path = PROJECT_ROOT / f"{output_name}.pdf"

    success, page_count = generate_pdf(elements, output_path)

    print(f"\nPDF generated: {output_path}")
    print(f"  Pages: {page_count}")
    print(f"  Characters: {char_count}")
    if page_count > 1:
        print(f"  WARNING: {page_count} pages (target: 1). Tailoring should reduce content.")


if __name__ == "__main__":
    main()
