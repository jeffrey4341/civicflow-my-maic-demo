from __future__ import annotations

import os
import re
import textwrap
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)

PITCH_PDF = OUT_DIR / "civicflow-my-mobile-maic-pitch.pdf"
BRIEF_PDF = OUT_DIR / "civicflow-my-mobile-submission-brief.pdf"

SLIDE_SIZE = (13.333 * inch, 7.5 * inch)
W, H = SLIDE_SIZE

NAVY = colors.HexColor("#10243f")
INK = colors.HexColor("#1f2937")
MUTED = colors.HexColor("#64748b")
BLUE = colors.HexColor("#0f6b99")
TEAL = colors.HexColor("#0f766e")
GOLD = colors.HexColor("#d99b2b")
GREEN = colors.HexColor("#2d7d46")
RED = colors.HexColor("#b42318")
PANEL = colors.HexColor("#f6f8fb")
LINE = colors.HexColor("#dbe3ed")
WHITE = colors.white


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w/.-]+\b", text))


def wrap_lines(text: str, width: int) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        para = para.strip()
        if not para:
            lines.append("")
            continue
        lines.extend(textwrap.wrap(para, width=width, break_long_words=False))
    return lines


def draw_header(c: canvas.Canvas, number: int, section: str) -> None:
    c.setFillColor(NAVY)
    c.rect(0, H - 0.52 * inch, W, 0.52 * inch, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawString(0.55 * inch, H - 0.32 * inch, "CivicFlow MY Mobile")
    c.setFont("Helvetica", 8.5)
    c.drawRightString(W - 0.55 * inch, H - 0.32 * inch, f"MAIC T5 - Public Services & Smart Cities | {section} | {number}/12")


def draw_footer(c: canvas.Canvas) -> None:
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.5)
    c.drawString(0.55 * inch, 0.28 * inch, "Public hackathon demo. 100% synthetic data. AI drafts; humans decide.")


def draw_title(c: canvas.Canvas, title: str, subtitle: str | None = None) -> None:
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 26)
    c.drawString(0.72 * inch, H - 1.35 * inch, title)
    if subtitle:
        c.setFillColor(BLUE)
        c.setFont("Helvetica-Bold", 13.5)
        c.drawString(0.74 * inch, H - 1.72 * inch, subtitle)


def draw_text_block(
    c: canvas.Canvas,
    x: float,
    y: float,
    text: str,
    width_chars: int,
    font_size: float = 13,
    leading: float = 18,
    color=INK,
) -> float:
    c.setFillColor(color)
    c.setFont("Helvetica", font_size)
    cursor = y
    for line in wrap_lines(text, width_chars):
        if not line:
            cursor -= leading * 0.65
            continue
        c.drawString(x, cursor, line)
        cursor -= leading
    return cursor


def draw_bullets(
    c: canvas.Canvas,
    x: float,
    y: float,
    items: list[str],
    width_chars: int,
    font_size: float = 12.3,
    leading: float = 16,
    bullet_color=TEAL,
) -> float:
    cursor = y
    for item in items:
        wrapped = textwrap.wrap(item, width=width_chars, break_long_words=False)
        c.setFillColor(bullet_color)
        c.circle(x, cursor + 4, 3.2, fill=1, stroke=0)
        c.setFillColor(INK)
        c.setFont("Helvetica", font_size)
        for idx, line in enumerate(wrapped):
            c.drawString(x + 0.18 * inch, cursor, line)
            cursor -= leading
            if idx == len(wrapped) - 1:
                cursor -= 4
    return cursor


def draw_panel(c: canvas.Canvas, x: float, y: float, w: float, h: float, title: str, body: list[str], accent=BLUE) -> None:
    c.setFillColor(PANEL)
    c.roundRect(x, y, w, h, 9, fill=1, stroke=0)
    c.setStrokeColor(LINE)
    c.roundRect(x, y, w, h, 9, fill=0, stroke=1)
    c.setFillColor(accent)
    c.rect(x, y + h - 0.12 * inch, w, 0.12 * inch, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 12.5)
    c.drawString(x + 0.24 * inch, y + h - 0.42 * inch, title)
    draw_bullets(c, x + 0.24 * inch, y + h - 0.78 * inch, body, 38, 10.7, 14, accent)


def slide(c: canvas.Canvas, number: int, section: str, title: str, subtitle: str | None = None) -> None:
    c.setPageSize(SLIDE_SIZE)
    c.setFillColor(WHITE)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    draw_header(c, number, section)
    draw_footer(c)
    draw_title(c, title, subtitle)


def create_pitch_pdf() -> None:
    c = canvas.Canvas(str(PITCH_PDF), pagesize=SLIDE_SIZE)

    slide(c, 1, "Overview", "CivicFlow MY Mobile", "Multilingual Citizen Service AI for Malaysian Public Agencies")
    c.setFillColor(TEAL)
    c.roundRect(0.72 * inch, 2.0 * inch, 5.25 * inch, 1.1 * inch, 12, fill=1, stroke=0)
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(1.02 * inch, 2.66 * inch, "AI drafts.")
    c.drawString(2.78 * inch, 2.66 * inch, "Humans decide.")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(1.02 * inch, 2.28 * inch, "Every case is traceable.")
    draw_text_block(
        c,
        0.75 * inch,
        4.58 * inch,
        "CivicFlow helps citizens submit public-service requests in Malay, English, Chinese or Tamil while helping officers triage, route, approve and audit cases using SOP-grounded AI.",
        56,
        15,
        22,
    )
    draw_panel(c, 6.45 * inch, 2.0 * inch, 5.95 * inch, 2.95 * inch, "MAIC T5 fit", [
        "Citizen service automation",
        "RAG with policy citations",
        "E-Gov AI workflow",
        "Multilingual LLM-ready interface",
        "Civic tech accountability",
    ], TEAL)
    c.showPage()

    slide(c, 2, "Problem", "Citizen services are multilingual, fragmented and hard to audit")
    draw_bullets(c, 0.9 * inch, 5.25 * inch, [
        "Citizens often do not know which department owns their issue.",
        "Requests arrive incomplete and across multiple languages and channels.",
        "Officers manually classify, route, reply and escalate cases.",
        "SLA visibility and audit evidence are weak when workflows live in inboxes and spreadsheets.",
    ], 76, 14, 21, RED)
    draw_panel(c, 7.05 * inch, 1.4 * inch, 4.65 * inch, 2.15 * inch, "Resulting pain", [
        "Slow first response",
        "Inconsistent service quality",
        "Repeated clarification loops",
        "Harder public-sector accountability",
    ], RED)
    c.showPage()

    slide(c, 3, "Why Now", "Public-sector AI needs workflow control, not just chat")
    draw_text_block(
        c,
        0.85 * inch,
        5.25 * inch,
        "Generic chatbots can answer questions, but public agencies need operational systems that can handle real casework. The next step for e-government is AI that can intake citizen requests, retrieve SOPs, recommend action, trigger human approval and preserve accountability.",
        92,
        14.5,
        21,
    )
    draw_panel(c, 0.9 * inch, 1.4 * inch, 3.55 * inch, 1.95 * inch, "Problem fit", ["Multilingual access", "Incomplete case intake", "Audit burden"], BLUE)
    draw_panel(c, 4.9 * inch, 1.4 * inch, 3.55 * inch, 1.95 * inch, "AI depth", ["Structured pipeline", "Policy retrieval", "Decision gates"], TEAL)
    draw_panel(c, 8.9 * inch, 1.4 * inch, 3.55 * inch, 1.95 * inch, "Demo maturity", ["Working app", "Tests and build", "Production smoke"], GOLD)
    c.showPage()

    slide(c, 4, "Solution", "A mobile-first citizen service workflow system")
    draw_bullets(c, 0.9 * inch, 5.35 * inch, [
        "Citizens submit service requests through a simple mobile-first app.",
        "CivicFlow detects language, classifies the issue and asks for missing information.",
        "The system retrieves relevant SOP / FAQ / service-charter citations and recommends department routing.",
        "High-risk or sensitive cases require officer or supervisor review before action.",
        "A complete audit trail records every stage.",
    ], 82, 13.4, 19, GREEN)
    c.showPage()

    slide(c, 5, "Demo Flow", "Three public-service workflows")
    draw_panel(c, 0.78 * inch, 3.95 * inch, 3.85 * inch, 1.75 * inch, "1. Flood-risk drainage", [
        "Malay citizen complaint",
        "Drainage classification",
        "Engineering / Drainage Unit",
        "SOP citation plus supervisor approval",
    ], RED)
    draw_panel(c, 4.92 * inch, 3.95 * inch, 3.85 * inch, 1.75 * inch, "2. Business licence", [
        "Chinese food-stall licence query",
        "Licensing FAQ citation",
        "Missing document checklist",
        "Reply draft in Chinese",
    ], BLUE)
    draw_panel(c, 9.05 * inch, 3.95 * inch, 3.85 * inch, 1.75 * inch, "3. Education / welfare", [
        "English aid request",
        "Welfare policy citation",
        "Officer review",
        "No automatic eligibility approval",
    ], TEAL)
    draw_text_block(c, 0.9 * inch, 2.35 * inch, "Same pipeline, three governed outcomes: approval gate, clarification and human eligibility review.", 92, 16, 23, NAVY)
    c.showPage()

    slide(c, 6, "Citizen Mobile App", "Accessible public-service intake")
    draw_bullets(c, 0.92 * inch, 5.3 * inch, [
        "Malay, English, Chinese and Tamil input",
        "Simple mobile-first submission",
        "Photo and location mock input",
        "AI clarification for missing information",
        "Case tracking status and multilingual reply drafts",
        "Synthetic-data-only demo mode",
    ], 62, 13, 19, TEAL)
    draw_text_block(c, 7.15 * inch, 4.95 * inch, "Citizens do not need to understand government department structures before asking for help.", 45, 17, 24, BLUE)
    c.showPage()

    slide(c, 7, "Officer Console", "From unstructured request to governed casework")
    draw_panel(c, 0.78 * inch, 3.45 * inch, 3.8 * inch, 2.15 * inch, "Triage", ["Case queue", "AI summary", "Detected language", "Category and urgency"], BLUE)
    draw_panel(c, 4.75 * inch, 3.45 * inch, 3.8 * inch, 2.15 * inch, "Evidence", ["Department routing", "SOP citation panel", "Missing-info checklist", "Reply draft"], TEAL)
    draw_panel(c, 8.72 * inch, 3.45 * inch, 3.8 * inch, 2.15 * inch, "Control", ["Supervisor approvals", "Blocked unsafe transitions", "Audit evidence timeline", "Human review"], GOLD)
    draw_text_block(c, 0.9 * inch, 2.15 * inch, "This turns AI from a chatbot into an operational casework assistant.", 82, 16, 22, NAVY)
    c.showPage()

    slide(c, 8, "AI Architecture", "Deterministic, citation-backed, human-governed")
    steps = ["Citizen input", "Language detection", "Case classification", "PII risk handling", "SOP / FAQ retrieval", "Routing decision", "Approval gate", "Reply draft", "Audit event"]
    x = 0.85 * inch
    y = 4.85 * inch
    for idx, step in enumerate(steps):
        c.setFillColor(PANEL if idx % 2 == 0 else colors.HexColor("#eaf6f5"))
        c.roundRect(x, y, 2.45 * inch, 0.52 * inch, 8, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 10.3)
        c.drawCentredString(x + 1.225 * inch, y + 0.19 * inch, step)
        if idx < len(steps) - 1:
            c.setFillColor(GOLD)
            c.setFont("Helvetica-Bold", 15)
            c.drawCentredString(x + 2.66 * inch, y + 0.17 * inch, ">")
        x += 2.9 * inch
        if idx == 3:
            x = 2.3 * inch
            y = 3.85 * inch
    draw_bullets(c, 0.95 * inch, 2.55 * inch, [
        "Runs locally with deterministic fallback.",
        "Optional LLM path is used only when a key is explicitly configured.",
        "Recommendations must carry citations or fall back to manual review.",
    ], 92, 12.8, 18, TEAL)
    c.showPage()

    slide(c, 9, "Governance & Safety", "Designed for public trust")
    draw_bullets(c, 0.9 * inch, 5.35 * inch, [
        "AI does not autonomously close high-risk cases.",
        "AI does not dispatch field teams.",
        "AI does not approve welfare, education or licensing eligibility.",
        "High-risk cases require human approval.",
        "Unsafe status transitions are blocked and audited.",
        "Low-confidence or uncited outputs fall back to manual review.",
        "All demo data and policy documents are synthetic.",
    ], 82, 12.8, 18, RED)
    draw_text_block(c, 0.9 * inch, 1.35 * inch, "Boundary: this is a hackathon demo, not production government software.", 88, 15, 20, NAVY)
    c.showPage()

    slide(c, 10, "Market & Buyers", "Who pays, and why now")
    draw_panel(c, 0.78 * inch, 4.12 * inch, 12.0 * inch, 1.34 * inch, "Beachhead - start here", [
        "Local council service desks: highest multilingual intake volume, weakest current triage tools",
    ], TEAL)
    draw_panel(c, 0.78 * inch, 1.75 * inch, 3.75 * inch, 2.02 * inch, "Expand to", [
        "State agencies",
        "Public universities",
        "Township operators",
        "Smart-city vendors",
    ], BLUE)
    draw_panel(c, 4.78 * inch, 1.75 * inch, 3.85 * inch, 2.02 * inch, "Commercial path", [
        "Paid pilot -> department subscription",
        "Per-case usage pricing",
        "Enterprise multi-agency deployment",
    ], GOLD)
    draw_panel(c, 8.88 * inch, 1.75 * inch, 3.9 * inch, 2.02 * inch, "Why now", [
        "MyDIGITAL: digital-first public sector",
        "MADANI agenda: inclusive digital services",
        "Budget and mandate alignment for pilots",
    ], GREEN)
    draw_text_block(c, 0.88 * inch, 0.96 * inch, "Buyer logic: start with the service desk that feels multilingual triage pain every day, then expand through agency departments and smart-city partners.", 104, 12.5, 17, NAVY)
    c.showPage()

    slide(c, 11, "Impact", "Better access, faster triage, stronger accountability")
    draw_panel(c, 0.72 * inch, 2.33 * inch, 3.95 * inch, 3.15 * inch, "Operational impact", [
        "Pilot target: cut officer triage from ~15 min manual to <3 min AI-assisted",
        "Fewer clarification loops before officer review",
        "SLA visibility and audit-ready case history",
    ], TEAL)
    draw_panel(c, 4.92 * inch, 2.33 * inch, 3.95 * inch, 3.15 * inch, "Economic impact", [
        "Faster licensing turnaround lowers SME waiting cost",
        "Self-service access for non-Malay-dominant citizens",
        "Lower manual overhead per case at scale",
    ], GOLD)
    draw_panel(c, 9.12 * inch, 2.33 * inch, 3.45 * inch, 3.15 * inch, "National alignment", [
        "Supports inclusive digital public services",
        "Fits Digital First and MADANI digitisation",
        "Built-in accountability: citations, gates, audit",
    ], GREEN)
    draw_text_block(c, 0.88 * inch, 1.2 * inch, "Pilot measurement: average triage time, first-response completeness, SLA visibility, officer override rate and citation-backed recommendation rate.", 108, 12.5, 17, NAVY)
    c.showPage()

    slide(c, 12, "Roadmap & Ask", "From demo to pilot")
    draw_panel(c, 0.72 * inch, 2.3 * inch, 3.95 * inch, 3.2 * inch, "Current artifact", [
        "Mobile citizen app + officer console",
        "SOP RAG, approval workflow, audit timeline",
        "Clean production dependency audit",
    ], TEAL)
    draw_panel(c, 4.92 * inch, 2.3 * inch, 3.95 * inch, 3.2 * inch, "Next 90 days", [
        "Hosted deployment + production security plan",
        "Expanded SOP corpus with real agency input",
        "Analytics dashboard for SLA tracking",
    ], BLUE)
    draw_panel(c, 9.12 * inch, 2.3 * inch, 3.45 * inch, 3.2 * inch, "Ask - be specific", [
        "Pilot partner: one local council or state agency service desk",
        "Mentorship: AI governance and procurement guidance",
        "Success: reduce triage time and improve first-response completeness",
    ], GOLD)
    draw_text_block(c, 0.88 * inch, 1.2 * inch, "Integration path: connect to each agency's approved apps, databases, SOP repositories, GIS systems and notification channels only after data-governance sign-off.", 108, 12.5, 17, NAVY)
    c.showPage()

    c.save()


def create_brief_pdf() -> None:
    summary = read_text(ROOT / "docs" / "submission" / "project_summary_500_words.txt")
    disclosure = read_text(ROOT / "docs" / "submission" / "ai_disclosure_statement.txt")

    doc = SimpleDocTemplate(
        str(BRIEF_PDF),
        pagesize=letter,
        rightMargin=0.72 * inch,
        leftMargin=0.72 * inch,
        topMargin=0.72 * inch,
        bottomMargin=0.72 * inch,
        title="CivicFlow MY Mobile Submission Brief",
    )
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="BriefTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="Meta",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=MUTED,
        spaceAfter=14,
    ))
    styles.add(ParagraphStyle(
        name="BriefHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13.5,
        leading=17,
        textColor=BLUE,
        spaceBefore=10,
        spaceAfter=6,
    ))
    styles.add(ParagraphStyle(
        name="BriefBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.2,
        leading=14.2,
        textColor=INK,
        spaceAfter=7,
    ))

    story = [
        Paragraph("CivicFlow MY Mobile - MAIC Submission Brief", styles["BriefTitle"]),
        Paragraph("Track: T5 - Public Services & Smart Cities | Artifact: public hackathon demo | Data: 100% synthetic", styles["Meta"]),
        Paragraph(f"Project Summary ({word_count(summary)} words)", styles["BriefHeading"]),
    ]
    for para in summary.split("\n\n"):
        story.append(Paragraph(para, styles["BriefBody"]))
    story.extend([
        Spacer(1, 10),
        Paragraph(f"AI Disclosure Statement ({word_count(disclosure)} words)", styles["BriefHeading"]),
    ])
    for para in disclosure.split("\n\n"):
        story.append(Paragraph(para, styles["BriefBody"]))

    doc.build(story)


def main() -> None:
    create_pitch_pdf()
    create_brief_pdf()
    print(PITCH_PDF)
    print(BRIEF_PDF)


if __name__ == "__main__":
    main()
