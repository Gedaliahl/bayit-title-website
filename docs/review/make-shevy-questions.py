# Renders docs/review/shevy-questions.md as a printable fill-in worksheet.
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, Table, TableStyle, Flowable, PageBreak, CondPageBreak,
                                KeepTogether)

OUT = "docs/review/shevy-questions.pdf"

INK, MUTED = colors.HexColor("#1a1a1a"), colors.HexColor("#5f6b73")
RULE, LINE = colors.HexColor("#c8d0d4"), colors.HexColor("#9aa7ae")
INVENT, INVENTBG = colors.HexColor("#8a3b2e"), colors.HexColor("#fbf3f1")
ACCENT = colors.HexColor("#1f4e5f")

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

S = dict(
    title   = ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=19, leading=23,
                             textColor=ACCENT, spaceAfter=3),
    sub     = ParagraphStyle("sub", fontName="Helvetica", fontSize=10, leading=14,
                             textColor=MUTED, spaceAfter=14),
    h1      = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=13.5, leading=17,
                             textColor=ACCENT, spaceBefore=18, spaceAfter=2),
    h1sub   = ParagraphStyle("h1sub", fontName="Courier", fontSize=8, leading=11,
                             textColor=MUTED, spaceAfter=10),
    h2      = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11, leading=14,
                             textColor=INK, spaceBefore=15, spaceAfter=5),
    body    = ParagraphStyle("body", fontName="Helvetica", fontSize=9.6, leading=13.6,
                             textColor=INK, spaceAfter=7, alignment=TA_JUSTIFY),
    ask     = ParagraphStyle("ask", fontName="Helvetica-Bold", fontSize=9.8, leading=13.6,
                             textColor=INK, spaceAfter=5),
    quote   = ParagraphStyle("quote", fontName="Helvetica-Oblique", fontSize=9.2, leading=13.2,
                             textColor=INVENT),
    caption = ParagraphStyle("caption", fontName="Helvetica-Bold", fontSize=7.4, leading=10,
                             textColor=INVENT, spaceAfter=3),
    note    = ParagraphStyle("note", fontName="Helvetica-Oblique", fontSize=9, leading=12.6,
                             textColor=MUTED, spaceAfter=6),
    cell    = ParagraphStyle("cell", fontName="Helvetica", fontSize=9.2, leading=12.4, textColor=INK),
    cellb   = ParagraphStyle("cellb", fontName="Helvetica-Bold", fontSize=9.2, leading=12.4, textColor=INK),
    slug    = ParagraphStyle("slug", fontName="Helvetica", fontSize=8.3, leading=11.4,
                             textColor=INK),
    sig     = ParagraphStyle("sig", fontName="Helvetica", fontSize=9.2, leading=13,
                             textColor=MUTED, spaceAfter=4),
)

class Rules(Flowable):
    def __init__(self, n=3, gap=21):
        Flowable.__init__(self); self.n, self.gap = n, gap
    def wrap(self, aw, ah):
        self.w = aw; return (aw, self.n * self.gap + 4)
    def draw(self):
        c = self.canv; c.setStrokeColor(LINE); c.setLineWidth(0.45)
        y = self.n * self.gap
        for _ in range(self.n):
            c.line(0, y, self.w, y); y -= self.gap

class Box(Flowable):
    def __init__(self, size=9):
        Flowable.__init__(self); self.size = size
    def wrap(self, aw, ah): return (self.size + 2, self.size + 2)
    def draw(self):
        c = self.canv; c.setStrokeColor(MUTED); c.setLineWidth(0.7)
        c.rect(0, 1, self.size, self.size, stroke=1, fill=0)

AVAIL = LETTER[0] - 1.5 * inch

def kt(*f):
    """Never split a prompt from the lines meant to answer it."""
    return KeepTogether(list(f))

def invented(caption, text):
    inner = [Paragraph(esc(caption), S["caption"]), Paragraph(esc(text), S["quote"])]
    t = Table([[inner]], colWidths=[AVAIL])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), INVENTBG),
        ("LINEBEFORE", (0,0), (0,-1), 2.2, INVENT),
        ("LEFTPADDING", (0,0), (-1,-1), 9), ("RIGHTPADDING", (0,0), (-1,-1), 9),
        ("TOPPADDING", (0,0), (-1,-1), 7), ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]))
    return t

def check(text):
    t = Table([[Box(), Paragraph(esc(text), S["cell"])]], colWidths=[17, AVAIL - 17])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 0), ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("TOPPADDING", (0,0), (-1,-1), 2), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    return t

def ask(text, lines=2):
    return kt(Paragraph(text, S["ask"]), Rules(lines))

def notes(label, n=4):
    return kt(Paragraph(esc(label), S["h2"]), Rules(n))

def grid(rows, widths, col0=None):
    data = []
    for i, r in enumerate(rows):
        row = []
        for j, c in enumerate(r):
            if i == 0:
                sty = S["cellb"]
            elif j == 0 and col0:
                sty = S[col0]
            else:
                sty = S["cell"]
            row.append(Paragraph(esc(c), sty))
        data.append(row)
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("GRID", (0,0), (-1,-1), 0.4, RULE),
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#eef2f4")),
        ("LEFTPADDING", (0,0), (-1,-1), 7), ("RIGHTPADDING", (0,0), (-1,-1), 7),
        ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    return t

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(MUTED)
    canvas.drawString(0.75*inch, LETTER[1] - 0.52*inch,
                      "BAYIT TITLE  ·  CONTENT REVIEW  ·  PREPARED 15 SEPTEMBER 2026")
    canvas.drawRightString(LETTER[0] - 0.75*inch, LETTER[1] - 0.52*inch, "FOR SHEVY LOWENSTEIN")
    canvas.setStrokeColor(RULE); canvas.setLineWidth(0.5)
    canvas.line(0.75*inch, LETTER[1]-0.62*inch, LETTER[0]-0.75*inch, LETTER[1]-0.62*inch)
    canvas.drawCentredString(LETTER[0]/2, 0.5*inch, "Page %d" % doc.page)
    canvas.restoreState()

st = []; A = st.append

A(Paragraph("Questions for Shevy", S["title"]))
A(Paragraph("The two library pages that can publish. Six answers — five about how the firm "
            "actually works, one statute check.", S["sub"]))

A(Paragraph("Before you start", S["h2"]))
A(Paragraph("Every question below exists because the draft currently states something that was "
            "<b>made up as a placeholder</b>. The prose reads as finished, which is why it is more "
            "dangerous than a visible gap — a reader cannot tell the difference, and neither "
            "can the build.", S["body"]))
A(invented("PASSAGES SHOWN LIKE THIS ARE INVENTED. THEY ARE ON THE DRAFT PAGE NOW.",
           "Wherever you see this box, the sentence inside is currently sitting on the page, "
           "written in your name, and nobody has confirmed it."))
A(Spacer(1, 8))
A(Paragraph("<b>A blank is a better answer than a plausible one.</b> If you do not know a figure "
            "off the top of your head, leave it blank or tick the box that cuts the sentence "
            "instead. Nothing here has to be filled in to be useful — every question has an "
            "option to publish nothing on that point, and each page reads perfectly well without "
            "its example.", S["body"]))
A(Paragraph("Your byline goes on both pages when they publish — Florida Title Agent, Licence "
            "W766033 — so these are your statements, not the drafter's.", S["body"]))

# ------------- page one -------------
A(Paragraph("Page one — “The HOA says approval takes 30 days and we close in two weeks. "
            "Now what?”", S["h1"]))
A(Paragraph("content/title-problems/hoa-approval-delay-closing-florida.md", S["h1sub"]))

A(Paragraph("HA-01 — Association approval turnaround", S["h2"]))
A(invented("ON THE PAGE NOW — QUICK FACTS, “TYPICAL TIMELINE”",
           "Seven to twenty-one days from a genuinely complete application in most communities, "
           "against a quoted window that is usually 30 days. Where an interview or a board meeting "
           "is required, the meeting calendar sets the date rather than the review itself. The "
           "shortest turnaround we have documented is three business days."))
A(Spacer(1, 9))
A(ask("(a) What range do you actually see, from a genuinely <i>complete</i> application to "
      "approval?"))
A(Spacer(1, 7))
A(ask("(b) What is your real fastest documented turnaround — and are you willing to "
      "publish it?"))
A(Spacer(1, 7))
A(kt(Paragraph("(c) Is the “an interview or board meeting sets the date” point "
               "true in your experience?", S["ask"]),
     check("Yes, as written."),
     check("No — cut it."),
     check("Rephrase:"),
     Rules(1)))

A(kt(Paragraph("HA-04 — A real example", S["h2"]),
     Paragraph("The draft carries the passage below, presented to readers as a composite of real "
               "Bayit Title files. None of it happened.", S["body"]),
     invented("ON THE PAGE NOW — BODY, “WHAT ACTUALLY SHORTENS IT?”",
              "a Broward condominium quoted 30 days. The application went in on a Monday with the "
              "current form, both fees paid by cashier's cheque as that association required, the "
              "executed contract with every addendum, and the background authorisation signed by "
              "both buyers. The management company confirmed receipt as complete on the Tuesday, "
              "the interview was held that Friday, and the certificate of approval issued the "
              "following Wednesday — nine days against a quoted thirty.")))
A(Spacer(1, 9))
A(Paragraph("One real composite, drawn from however many files you like. No client-identifying "
            "detail — county and property type only.", S["body"]))
A(ask("What the association quoted:", 1))
A(Spacer(1, 5))
A(ask("What went in, and how complete it was:", 2))
A(Spacer(1, 5))
A(ask("What actually happened, and how long it took:", 2))
A(Spacer(1, 7))
A(check("We don't have one worth publishing — cut the example. (The page still works "
        "without it.)"))
A(Spacer(1, 14))
A(notes("Anything else about this page?", 5))

A(PageBreak())

# ------------- page two -------------
A(Paragraph("Page two — “The contract isn’t the standard form. What does that "
            "change at closing?”", S["h1"]))
A(Paragraph("content/title-problems/non-standard-purchase-contract-florida-closing.md", S["h1sub"]))
A(Paragraph("This page carries three warnings saying outright that it is not publishable. All "
            "three come out when you answer.", S["note"]))

A(kt(Paragraph("NS-02 — What you read first", S["h2"]),
     invented("ON THE PAGE NOW — LABELLED “PLACEHOLDER… IT MUST BE REPLACED WITH "
              "THE ORDER BAYIT TITLE ACTUALLY WORKS IN”",
              "1. The parties and the property · 2. Price, deposit and who holds it · "
              "3. The closing date and how deadlines count · 4. Conditions to closing · "
              "5. Cost allocation · 6. Title and survey provisions · 7. Default and "
              "remedies · 8. Every addendum, in date order")))
A(Spacer(1, 9))
A(ask("When a bespoke contract lands on your desk, what do you actually read first? Renumber the "
      "list above, strike anything you don’t check, add what is missing.", 4))

A(kt(Paragraph("NS-03 — One real file", S["h2"]),
     Paragraph("The draft’s example is labelled “none of it comes from a real file and "
               "all of it must be replaced or deleted.” It needs three things from one "
               "genuine file.", S["body"])))
A(ask("(a) Which terms differed from the standard form?"))
A(Spacer(1, 5))
A(ask("(b) Did any of them change a <i>title</i> requirement — or only the closing "
      "statement and the schedule?"))
A(Spacer(1, 5))
A(ask("(c) What did you ask to be clarified in writing before you built the closing "
      "statement?"))
A(Spacer(1, 7))
A(check("Use no example — cut the section."))

A(kt(Paragraph("NS-01 — Time and cost", S["h2"]),
     invented("ON THE PAGE NOW — QUICK FACTS, “TYPICAL TIMELINE”",
              "What a bespoke contract adds is reading time at the front — allow an extra day "
              "or two on opening the file, and longer where an ambiguous term has to be confirmed "
              "in writing by both sides before the closing statement can be built.")))
A(Spacer(1, 9))
A(ask("(a) Realistically, how much extra time does a non-standard contract add at file "
      "opening?"))
A(Spacer(1, 5))
A(ask("(b) Does it cost the client anything extra? If not, say so — “no additional "
      "charge” is a useful thing for a page to state plainly."))
A(Spacer(1, 14))
A(notes("Anything else about this page?", 4))

# ------------- statute -------------
A(CondPageBreak(250))
A(Paragraph("One statute check", S["h1"]))
A(Paragraph("Not a placeholder — a conflict. The HOA page cites the same rule twice, to two "
            "different subsections.", S["body"]))
A(grid([["Where", "Citation", "Claim"],
        ["Quick facts, line 23", "Fla. Stat. § 718.112(2)(i)",
         "condominium transfer fee capped at $150 per applicant"],
        ["Body, line 40", "Fla. Stat. § 718.112(2)(k)",
         "condominium transfer fee capped at $150 per applicant"]],
       [1.5*inch, 1.9*inch, AVAIL - 3.4*inch]))
A(Spacer(1, 9))
A(ask("At least one is wrong. Deliberately not resolved from memory. Against the current statute "
      "text — which subsection, and is $150 still the figure?"))

# ------------- sign-off -------------
A(CondPageBreak(230))
A(Paragraph("Sign-off", S["h1"]))
A(Paragraph("Answering the questions is not the same as approving the pages. Once the answers are "
            "written in, both pages need your read of the finished text — the byline says a "
            "licensed Florida title agent stands behind every word, including the parts nobody "
            "flagged.", S["body"]))
A(Spacer(1, 4))
A(kt(check("I have answered the questions above."),
     check("I have read both finished pages in full and they are accurate."),
     check("Publish both under my byline."),
     Spacer(1, 26),
     Paragraph("Signed  ..................................................................        "
               "Date  ................................", S["sig"]),
     Spacer(1, 4),
     Paragraph("Shevy Lowenstein — Florida Title Agent, Licence W766033", S["sig"])))

# ------------- appendix -------------
A(Spacer(1, 26))
A(CondPageBreak(320))
A(Paragraph("Appendix — why only two pages", S["h1"]))
A(Paragraph("Seven of the nine drafts cannot publish no matter what you answer here, because each "
            "carries at least one fact only First American or a lawyer can confirm.", S["body"]))
A(grid([["Page", "Blocked on"],
        ["mobile-and-remote-signings",
         "First American's RON position; plus which team members hold Florida online notary "
         "registrations — that one must come from the Department of State commission record, "
         "not from anyone's memory"],
        ["open-permits-before-closing-florida",
         "FAR/BAR allocation of permit responsibility; First American's coverage position"],
        ["litigation-against-seller-flip-florida",
         "First American's position on pending litigation and recorded lis pendens"],
        ["buying-property-bankruptcy-estate-florida",
         "Underwriter requirements for a bankruptcy sale order"],
        ["judgment-against-seller-before-closing-florida",
         "Identity-affidavit form First American accepts; plus tenancy by the entireties, which "
         "needs a Florida real estate attorney"],
        ["foreign-seller-signing-from-abroad-florida",
         "First American's RON position for out-of-country signers"],
        ["no-legal-access-landlocked-property-florida",
         "Standard access exception language in our commitments; endorsement availability"]],
       [2.72*inch, AVAIL - 2.72*inch], col0="slug"))
A(Spacer(1, 10))
A(Paragraph("Those pages also carry 19 Bayit-Title-only placeholders that you <i>can</i> clear "
            "whenever you want. Clearing them will not publish the pages, but it removes invented "
            "text from anything anyone previews. The full list is in docs/verify-worklist.md.",
            S["body"]))

doc = BaseDocTemplate(OUT, pagesize=LETTER,
                      leftMargin=0.75*inch, rightMargin=0.75*inch,
                      topMargin=0.78*inch, bottomMargin=0.72*inch,
                      title="Questions for Shevy - Bayit Title content review",
                      author="Bayit Title")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="f")
doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=header_footer)])
doc.build(st)
print("wrote", OUT)
