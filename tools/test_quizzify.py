#!/usr/bin/env python3
"""End-to-end tests for the PDF → .quizz converter.

Builds two synthetic test PDFs with reportlab (a clean one in the style of the
recommended prompt, and a messier one with inline answers and wrapped lines),
converts them, and asserts the parsed content.

    python3 tools/test_quizzify.py
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

import quizzify  # noqa: E402

CLEAN_TEXT = """Test: Chemistry — Chemical Bonding
Total questions: 6

1. Which molecule contains a triple covalent bond?
A) O2
B) N2
C) Cl2
D) H2
2. How many electrons are shared in N2?
A) 2
B) 4
C) 6
D) 8
3. An ionic bond is formed by:
A) Sharing electron pairs
B) Transfer of electrons from metal to non-metal
C) Overlap of p orbitals only
D) Attraction between two nuclei
4. Which molecule has a trigonal planar shape?
A) CH4
B) NH3
C) BF3
D) H2O
5. The strongest intermolecular force in water is:
A) London dispersion
B) Dipole-dipole
C) Hydrogen bonding
D) Ionic attraction
6. Which of these is a non-polar molecule with polar bonds?
A) HCl
B) CO2
C) H2O
D) NH3

Answer Key
1. B
2. C
3. B
4. C
5. C
6. B

Explanations
1. N2 has one sigma and two pi bonds, so it has a triple bond. O2 is a double bond and Cl2/H2 are single bonds.
2. A triple bond is three shared pairs, so 3 x 2 = 6 electrons are shared.
3. Ionic bonding transfers electrons from a metal to a non-metal, creating oppositely charged ions.
4. BF3 has three bonding pairs and no lone pair, giving 120 degree angles and a trigonal planar shape.
5. Water can both donate and accept hydrogen bonds through its O-H bonds, which is stronger than dipole forces.
6. CO2 is linear, so its two C=O dipoles cancel exactly.
"""

MESSY_TEXT = """Physics - Motion and Force
Name: ____________    Roll No: ______

1) A car accelerates from rest to 20 m/s in 5 s. Its acceleration is:
(a) 2 m/s2
(b) 4 m/s2
(c) 5 m/s2
(d) 10 m/s2
Answer: B
Explanation: a = (v - u)/t = (20 - 0)/5 = 4 m/s2.

2) The SI unit of force is:
(a) joule
(b) newton
(c) pascal
(d) watt
Answer: B

3) Which quantity is a vector?
A. Speed
B. Distance
C. Velocity
D. Mass
Answer: C
Explanation: Velocity has both magnitude and direction, so it is a vector.

Answers
1-B  2-B  3-C

Explanations
1. Acceleration is the change in velocity divided by time: 20/5 = 4 m/s2.
2. Force is measured in newtons (N).
3. Speed and distance are scalars; velocity and mass are not both vectors - velocity is.
"""


def write_pdf(path: Path, text: str) -> None:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    y = height - 60
    for line in text.splitlines():
        c.drawString(50, y, line)
        y -= 16
        if y < 60:
            c.showPage()
            y = height - 60
    c.save()


def convert(path: Path, out: Path) -> dict:
    result = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "quizzify.py"), str(path), "-o", str(out), "--subject", "Test"],
        capture_output=True,
        text=True,
    )
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
    assert result.returncode == 0, "converter failed"
    return json.loads(out.read_text())


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)

        print("=== clean PDF ===")
        clean_pdf = tmpdir / "clean.pdf"
        write_pdf(clean_pdf, CLEAN_TEXT)
        pack = convert(clean_pdf, tmpdir / "clean.quizz")
        assert len(pack["questions"]) == 6, pack["questions"]
        assert [q["n"] for q in pack["questions"]] == [1, 2, 3, 4, 5, 6]
        assert [q["answer"] for q in pack["questions"]] == [["B"], ["C"], ["B"], ["C"], ["C"], ["B"]]
        assert all(q["explanation"] for q in pack["questions"]), "missing explanations"
        assert pack["questions"][0]["options"][1] == {"key": "B", "text": "N2"}
        assert pack["questions"][0]["options"][0]["key"] == "A"
        assert pack["title"].startswith("Test: Chemistry"), pack["title"]

        print("=== messy PDF (inline answers, lowercase options, wrapped) ===")
        messy_pdf = tmpdir / "messy.pdf"
        write_pdf(messy_pdf, MESSY_TEXT)
        pack2 = convert(messy_pdf, tmpdir / "messy.quizz")
        assert len(pack2["questions"]) == 3, [q["n"] for q in pack2["questions"]]
        assert [q["answer"] for q in pack2["questions"]] == [["B"], ["B"], ["C"]]
        assert all(q["explanation"] for q in pack2["questions"]), [q.get("explanation") for q in pack2["questions"]]
        assert pack2["questions"][0]["options"][1]["text"] == "4 m/s2"

        print("=== scanned / empty PDF is rejected ===")
        empty_pdf = tmpdir / "empty.pdf"
        write_pdf(empty_pdf, "")
        result = subprocess.run(
            [sys.executable, str(ROOT / "tools" / "quizzify.py"), str(empty_pdf), "-o", str(tmpdir / "x.quizz")],
            capture_output=True,
            text=True,
        )
        assert result.returncode != 0, "empty pdf should fail"

        print("=== plain text input works too ===")
        txt = tmpdir / "clean.txt"
        txt.write_text(CLEAN_TEXT, encoding="utf-8")
        pack3 = convert(txt, tmpdir / "txt.quizz")
        assert len(pack3["questions"]) == 6
        assert pack3["questions"][5]["answer"] == ["B"]

        print("=== packs validate against the app rules ===")
        for p in (pack, pack2, pack3):
            issues = quizzify.build_pack(
                quizzify.parse_questions(quizzify.page_lines([MESSY_TEXT]))[:1],
                "t", "s", source_name="x", pages=1, checksum="0",
            )[1]
            assert issues == [], issues

    print("\nAll converter tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
