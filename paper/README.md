# Paper: LaTeX Source

This directory contains the arXiv-ready LaTeX source for the measurement paper

> **Measuring Model Substitution in OpenAI-Compatible API Resellers: A 14-Day Study of 171 Endpoints**
> Bazaarlink Research, 2026-04-26 (arXiv-v1)

A markdown rendering of the same content lives in [`docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.arxiv.md`](../docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.arxiv.md) (Traditional Chinese) and [`.arxiv.en.md`](../docs/reports/2026-04-26-llm-resale-substitution-measurement-paper.arxiv.en.md) (English).

---

## Layout

```
paper/
├── README.md                # this file
├── arxiv-en/                # English edition (pdflatex)
│   ├── main.tex             # paper body
│   ├── refs.bib             # bibliography (9 entries)
│   └── fig-architecture.tex # Fig 1 (TikZ, self-contained)
└── arxiv-zh/                # Traditional Chinese edition (xelatex + ctex)
    ├── main.tex
    ├── refs.bib             # (same content as arxiv-en/refs.bib)
    └── fig-architecture.tex # (same as arxiv-en, English labels in fig)
```

The two editions are content-parallel; the figure ships English labels in
both (TikZ rendering inside the chinese edition imports the same source).

---

## Building locally

### Option A — Overleaf (recommended, no local install)

1. Create a new Overleaf project, "Upload Project as ZIP".
2. ZIP the contents of `arxiv-en/` (or `arxiv-zh/`) — flat, **not** including
   the parent `arxiv-en/` folder itself.
3. In Overleaf project settings:
   - English edition: set **Compiler** = `pdfLaTeX`.
   - Chinese edition: set **Compiler** = `XeLaTeX`.
4. Click "Recompile". A PDF appears.

### Option B — Local TeX Live / MiKTeX

Requires the `lm`, `microtype`, `tikz`, `booktabs`, `tabularx`, `hyperref`,
`cleveref`, `listings` packages (all in TeX Live full / `texlive-latex-extra`).

```bash
# English edition
cd arxiv-en
pdflatex main
bibtex   main
pdflatex main
pdflatex main          # third pass to settle cross-refs
# → main.pdf

# Chinese edition (needs xelatex + ctex)
cd ../arxiv-zh
xelatex  main
bibtex   main
xelatex  main
xelatex  main
# → main.pdf
```

Or with `latexmk`:

```bash
cd arxiv-en && latexmk -pdf main
cd arxiv-zh && latexmk -xelatex main
```

---

## Submitting to arXiv

arXiv accepts LaTeX source uploads and compiles server-side; you do **not**
upload the PDF. Submit the English edition (`arxiv-en/`).

### Steps

1. **Create an account at https://arxiv.org/user/register**.
2. **Get an endorsement.** First-time submitters in `cs.CR` (Cryptography and
   Security) or `cs.CY` (Computers and Society) need an endorsement from an
   already-published author. Typical path: email a contact in the field with
   the abstract; arXiv provides an endorser request form.
3. **Bundle the source.** From the repo root:

   ```bash
   cd paper/arxiv-en
   zip -r ../arxiv-submission.zip main.tex refs.bib fig-architecture.tex
   ```

   The zip should contain those three files at the **top level** (no
   `arxiv-en/` directory inside).

4. **Upload at https://arxiv.org/abs/submit**:
   - Primary category: `cs.CR` (Cryptography and Security)
   - Cross-list: `cs.CY` (Computers and Society)
   - License: prefer `arXiv non-exclusive license` (compatible with our
     AGPL-3.0 software release; the paper PDF itself is content, not code,
     and the arXiv default license is fine).
   - Comments field: "v1 -- 14-day field measurement, 171 endpoints, 625 probes."

5. **Add the supplementary metadata.** ORCID / author info / author note can
   be added later; arXiv allows revising metadata after submission.

6. **arXiv will compile your source server-side**; review the resulting PDF
   before "Submit" finalizes. Check Fig 1 renders correctly.

7. After acceptance you'll receive an arXiv identifier (e.g. `2604.NNNNN`).
   Cite with `arXiv:2604.NNNNN`.

### Submitting the Chinese edition (optional)

arXiv accepts non-English manuscripts; the Chinese edition uses XeLaTeX +
ctex which arXiv supports. Submit `arxiv-zh/main.tex` separately or as a
companion entry; the bibliography file (`refs.bib`) is shared.

---

## Notes on the source

- **No external dependencies beyond standard TeX Live.** All figures are
  inline TikZ (no PDF / SVG / PNG attachments needed).
- **No proprietary fonts.** English edition uses Latin Modern (free); Chinese
  edition uses ctex's default which selects available CJK fonts.
- **The full endpoint codename mapping is intentionally withheld** from the
  arXiv source per the paper's Disclosure section. The mapping is preserved
  in the authors' internal records and may be requested via the open-source
  repository for bona-fide research purposes.
- **Companion data:** the open-source package `@bazaarlink/probe-engine`
  v0.7.1 (this repository) ships with the 22-model baseline snapshot used for
  the §5.1 figure, and reproduces §5's evaluation pipeline (see Appendix C of
  the paper).

---

## Edits and revisions

If revising the paper:

1. Edit `arxiv-en/main.tex` (and/or `arxiv-zh/main.tex`).
2. Optionally re-sync from the markdown editions in `docs/reports/`.
3. Recompile locally to verify; the resulting PDF should pass arXiv's
   compilation step.
4. For arXiv revisions: upload the new source as `v2`, etc. arXiv preserves
   all versions.

The markdown editions in `docs/reports/` and the LaTeX editions in `paper/`
are synced manually — keep them in lockstep when making content changes.

---

## License

The paper text is © 2026 Bazaarlink Research, available for academic
reproduction under the arXiv non-exclusive distribution license. The
companion software (`@bazaarlink/probe-engine`) is AGPL-3.0.
