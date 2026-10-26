# -*- coding: utf-8 -*-
# Génère maison_whitmore.tex (plans TikZ de la maison Whitmore) à partir de maison.yaml.
# Usage : python3 gen.py maison_whitmore.tex   puis   xelatex maison_whitmore.tex (ou lualatex)
# Les données (pièces, portes, descriptions) se modifient dans maison.yaml, pas ici.
import os, yaml

CAT = {"rec": "rec", "fam": "fam", "srv": "srv", "cir": "cir", "ext": "ext", "san": "san"}

def load(path=os.path.join(os.path.dirname(os.path.abspath(__file__)), "maison.yaml")):
    data = yaml.safe_load(open(path, encoding="utf8"))
    levels = []
    for lv in data["niveaux"]:
        L = dict(key=lv["cle"], title=lv["titre"], height=lv["hauteur"], intro=lv["intro"],
                 built=lv.get("construit", True), wing=lv.get("aile", True),
                 rooms=[], doors=[], extra=list(lv.get("tikz_extra", [])))
        for r in lv["pieces"]:
            x1, y1, x2, y2 = r["rect"]
            if r["cat"] not in CAT:
                raise ValueError(f"{r['num']} : catégorie inconnue {r['cat']!r}")
            L["rooms"].append(dict(num=r["num"], x1=x1, y1=y1, x2=x2, y2=y2, name=r["nom"], cat=r["cat"],
                                   desc=r.get("desc", ""), short=r.get("court", r["nom"]),
                                   label=r.get("etiquette", True)))
        for d in lv.get("portes", []):
            x, y, o = d[:3]
            L["doors"].append((x, y, o, d[3] if len(d) > 3 else 3, d[4] if len(d) > 4 else "d"))
        levels.append(L)
    return levels

LEVELS = load()

# ================================================================= TikZ
def fmt(v):
    return ("%g" % v)

def stairs_grand(x1, y1, x2, y2):
    out = [r"\fill[cir] (%s,%s) rectangle (%s,%s);" % (x1, y1, x2, y2)]
    mid = (x1 + x2) / 2
    # deux volées et un jour central
    for k in range(int(y1) + 2, int(y2) - 3):
        out.append(r"\draw[tread] (%s,%s) -- (%s,%s);" % (x1, k, mid - 1, k))
        out.append(r"\draw[tread] (%s,%s) -- (%s,%s);" % (mid + 1, k, x2, k))
    out.append(r"\draw[thin] (%s,%s) rectangle (%s,%s);" % (mid - 1, y1 + 2, mid + 1, y2 - 3))
    out.append(r"\draw[->,thin] (%s,%s) -- (%s,%s);" % ((x1 + mid - 1) / 2, y1 + 2.5, (x1 + mid - 1) / 2, y2 - 3.5))
    return out

def stairs_service(x1, y1, x2, y2):
    out = [r"\fill[cir] (%s,%s) rectangle (%s,%s);" % (x1, y1, x2, y2)]
    for k in range(int(y1) + 1, int(y2) - 4):
        out.append(r"\draw[tread] (%s,%s) -- (%s,%s);" % (x1 + 3.5, k, x2, k))
    out.append(r"\fill[srv] (%s,%s) rectangle (%s,%s); \draw[thin] (%s,%s) rectangle (%s,%s);" % (x1, y2 - 4, x1 + 3, y2, x1, y2 - 4, x1 + 3, y2))
    out.append(r"\draw[thin] (%s,%s) -- (%s,%s) (%s,%s) -- (%s,%s);" % (x1, y2 - 4, x1 + 3, y2, x1, y2, x1 + 3, y2 - 4))
    out.append(r"\node[tiny] at (%s,%s) {M};" % (x1 + 1.5, y2 - 5.2))
    return out

def plan_tikz(L):
    o = []
    o.append(r"\begin{tikzpicture}[x=0.205cm,y=0.205cm]")
    ymin = min(r["y1"] for r in L["rooms"]) - 1
    # mitoyens
    o.append(r"\fill[pattern=north east lines, pattern color=wallc!45] (-3,%s) rectangle (0,76);" % 0)
    o.append(r"\fill[pattern=north east lines, pattern color=wallc!45] (36,0) rectangle (39,76);")
    o.append(r"\node[tiny,rotate=90] at (-1.5,38) {maison voisine};")
    o.append(r"\node[tiny,rotate=90] at (37.5,38) {maison voisine};")
    # rue
    o.append(r"\node[tiny] at (18,%s) {\caps{côté rue — Belgrave Square}};" % (ymin - 1.6))
    o.append(r"\node[tiny] at (18,78) {\caps{côté jardin}};")
    for r in L["rooms"]:
        o.append(r"\fill[%s] (%s,%s) rectangle (%s,%s);" % (r["cat"], fmt(r["x1"]), fmt(r["y1"]), fmt(r["x2"]), fmt(r["y2"])))
    # escaliers
    for r in L["rooms"]:
        n = r["name"]
        if n.startswith("Grand escalier") or (L["key"] in "PDT" and n.startswith("Pal")):
            o += stairs_grand(r["x1"], r["y1"], r["x2"], r["y2"])
        if n.startswith("Escalier de service"):
            o += stairs_service(r["x1"], r["y1"], r["x2"], r["y2"])
    for r in L["rooms"]:
        st = "wall" if r["cat"] != "ext" else "extwall"
        o.append(r"\draw[%s] (%s,%s) rectangle (%s,%s);" % (st, fmt(r["x1"]), fmt(r["y1"]), fmt(r["x2"]), fmt(r["y2"])))
    # enveloppe
    o.append(r"\draw[outer] (0,0) rectangle (36,52);")
    if L["wing"]:
        o.append(r"\draw[outer] (0,52) -- (0,76) -- (20,76) -- (20,52);")
    for e in L["extra"]:
        o.append(e)
    # portes
    for (x, y, ori, w, kind) in L["doors"]:
        h = w / 2
        if ori == "h":
            o.append(r"\fill[white] (%s,%s) rectangle (%s,%s);" % (fmt(x - h), fmt(y - 0.45), fmt(x + h), fmt(y + 0.45)))
            o.append(r"\draw[jamb] (%s,%s) -- (%s,%s) (%s,%s) -- (%s,%s);" % (fmt(x - h), fmt(y - 0.5), fmt(x - h), fmt(y + 0.5), fmt(x + h), fmt(y - 0.5), fmt(x + h), fmt(y + 0.5)))
            if kind == "f":
                o.append(r"\draw[fold] (%s,%s) -- (%s,%s);" % (fmt(x - h), fmt(y), fmt(x + h), fmt(y)))
        else:
            o.append(r"\fill[white] (%s,%s) rectangle (%s,%s);" % (fmt(x - 0.45), fmt(y - h), fmt(x + 0.45), fmt(y + h)))
            o.append(r"\draw[jamb] (%s,%s) -- (%s,%s) (%s,%s) -- (%s,%s);" % (fmt(x - 0.5), fmt(y - h), fmt(x + 0.5), fmt(y - h), fmt(x - 0.5), fmt(y + h), fmt(x + 0.5), fmt(y + h)))
    # étiquettes
    for r in L["rooms"]:
        if not r["label"]:
            continue
        w = (r["x2"] - r["x1"]) * 0.205 - 0.15
        hgt = r["y2"] - r["y1"]
        cx, cy = (r["x1"] + r["x2"]) / 2, (r["y1"] + r["y2"]) / 2
        if w >= 1.6 and hgt >= 6:
            o.append(r"\node[lab, text width=%.2fcm] at (%s,%s) {\textbf{%s}\\ %s};" % (w, fmt(cx), fmt(cy), r["num"], r["short"]))
        else:
            o.append(r"\node[lab] at (%s,%s) {\textbf{%s}};" % (fmt(cx), fmt(cy), r["num"]))
    # repères des pièces sans étiquette (circulations)
    for r in L["rooms"]:
        if r["label"]:
            continue
        cx, cy = (r["x1"] + r["x2"]) / 2, (r["y1"] + r["y2"]) / 2
        if r["num"].endswith("b"):
            continue
        if r["name"].startswith(("Grand escalier", "Palier", "Escalier")):
            o.append(r"\node[numtag] at (%s,%s) {%s};" % (fmt(r["x2"] - 1.6 if not r['name'].startswith('Escalier') else r["x1"] + 1.6), fmt(r["y1"] + 1.3), r["num"]))
        else:
            o.append(r"\node[numtag] at (%s,%s) {%s};" % (fmt(cx), fmt(cy), r["num"]))
    # échelle
    o.append(r"\begin{scope}[shift={(0,%s)}]" % (ymin - 4.6))
    o.append(r"\draw[thin] (0,0) -- (20,0); \foreach \i in {0,5,...,20} \draw[thin] (\i,0) -- (\i,0.6);")
    o.append(r"\node[tiny,anchor=west] at (20.5,0.2) {20 ft $\approx$ 6,1 m};")
    o.append(r"\end{scope}")
    o.append(r"\end{tikzpicture}")
    return "\n".join(o)

def esc(s):
    return s.replace("&", r"\&").replace("%", r"\%").replace("#", r"\#")

def italicize(s):
    # titres d'œuvres
    return s.replace("La Panthère des neiges", r"\emph{La Panthère des neiges}")

def desc_block(L):
    o = [r"\begin{descr}"]
    for r in L["rooms"]:
        if not r["desc"]:
            continue
        txt = italicize(esc(r["desc"]))
        txt = txt.replace("Ce soir :", r"\textit{Ce soir :}")
        o.append(r"\item[\textbf{%s}] \textbf{%s}. %s" % (r["num"], esc(r["name"]), txt))
    o.append(r"\end{descr}")
    return "\n".join(o)

# ================================================================= Plan de masse et coupe (profondeur horizontale)
SITE = r"""
\begin{tikzpicture}[x=0.1cm,y=0.1cm]
% profondeur -> x ; largeur -> y
\fill[road] (-26,-4) rectangle (-14,40);
\node[tiny,rotate=90] at (-20,18) {rue (Belgrave Square)};
\fill[pave] (-14,-4) rectangle (-8,40);
\node[tiny,rotate=90] at (-11,18) {trottoir};
\fill[ext] (-8,0) rectangle (0,36);
\fill[rec] (0,0) rectangle (52,36);
\fill[fam] (52,16) rectangle (76,36);
\fill[ext] (52,0) rectangle (70,16);
\fill[garden] (70,0) rectangle (112,16) (76,16) rectangle (112,36);
\fill[srv] (112,0) rectangle (136,36);
\fill[road] (136,-4) rectangle (146,40);
\draw[outer] (0,0) rectangle (52,36);
\draw[outer] (52,36) -- (76,36) -- (76,16) -- (52,16);
\draw[wall] (-8,0) rectangle (0,36) (52,0) rectangle (70,16) (112,0) rectangle (136,36);
\fill[pattern=north east lines, pattern color=wallc!45] (-8,-4) rectangle (136,0) (-8,36) rectangle (136,40);
\node[tiny] at (-4,18) [rotate=90] {cour anglaise};
\node[lab, text width=4.4cm] at (26,18) {\textbf{Maison principale}\\ sous-sol + 4 étages + combles};
\node[lab, text width=2.2cm] at (64,26) {\textbf{Aile arrière}\\ sous-sol à 2\textsuperscript{e}};
\node[lab, text width=1.7cm] at (61,8) {\textbf{Cour}\\ (jardin d'hiver au 1\textsuperscript{er})};
\node[lab, text width=3.5cm] at (94,18) {\textbf{Jardin}};
\node[lab, text width=2.3cm] at (124,18) {\textbf{Écuries et remise}\\ (cocher à l'étage)};
\node[tiny,rotate=90] at (141,18) {ruelle des écuries (mews)};
% échelle
\draw[thin] (0,-8) -- (50,-8); \foreach \i in {0,10,...,50} \draw[thin] (\i,-8) -- (\i,-7.2);
\node[tiny,anchor=west] at (51,-8) {50 ft $\approx$ 15 m};
\node[tiny,anchor=west] at (-26,43) {\caps{plan de masse}};
\end{tikzpicture}
"""

SECTION = r"""
\begin{tikzpicture}[x=0.1cm,y=0.1cm]
% coupe longitudinale : x = profondeur (ft), y = hauteur (ft), rue a y = -3
\fill[pave] (-26,-3) rectangle (-8,-4);
\draw[thick] (-26,-3) -- (-8,-3);
\node[tiny] at (-17,-1.6) {rue / trottoir};
% sol
\fill[earth] (-8,-14) rectangle (146,-11);
\fill[earth] (-26,-14) rectangle (-8,-4);
\fill[earth] (76,-11) rectangle (146,-3);
% cour anglaise
\draw[wall] (-8,-11) -- (-8,-3);
% niveaux maison principale
\foreach \a/\b/\c/\n in {-11/0/srv/Sous-sol (11 ft), 0/14/rec/Rez-de-chaussée (14 ft), 14/30/rec/1\textsuperscript{er} étage (16 ft), 30/42/fam/2\textsuperscript{e} étage (12 ft), 42/52/fam/3\textsuperscript{e} étage (10 ft)} {
  \fill[\c] (0,\a) rectangle (52,\b);
  \draw[wall] (0,\a) rectangle (52,\b);
  \node[tiny,anchor=west] at (1,{(\a+\b)/2}) {\n};
}
% combles mansardés
\fill[srv] (0,52) -- (3,61) -- (49,61) -- (52,52) -- cycle;
\draw[wall] (0,52) -- (3,61) -- (49,61) -- (52,52);
\draw[outer] (3,61) -- (6,64) -- (46,64) -- (49,61);
\node[tiny,anchor=west] at (5,56.5) {Combles (8 ft)};
% aile
\foreach \a/\b/\c in {-11/0/srv, 0/14/fam, 14/30/fam, 30/42/fam} { \fill[\c] (52,\a) rectangle (76,\b); \draw[wall] (52,\a) rectangle (76,\b); }
% écuries
\fill[srv] (112,-3) rectangle (136,9); \fill[srv] (112,9) -- (124,16) -- (136,9) -- cycle;
\draw[wall] (112,-3) rectangle (136,9) (112,9) -- (124,16) -- (136,9);
\node[tiny] at (124,3) {écuries};
\node[tiny] at (124,11) {cocher};
\draw[outer] (0,-11) rectangle (52,52);
\draw[outer] (52,-11) rectangle (76,42);
% verrière
\draw[thick] (2,61) -- (7,64);
% repères de hauteur
\foreach \h in {0,14,30,42,52} \draw[thin] (-3,\h) -- (-1,\h);
\node[tiny,anchor=west] at (-26,66) {\caps{coupe longitudinale}};
\node[tiny,text width=3.4cm,align=left] at (95,24) {Coupe dans l'axe de l'aile. Le jardin d'hiver, à côté de l'aile au 1\textsuperscript{er} étage, n'y figure pas. Le jardin est au niveau de la rue ; la cour arrière, en contrebas, au niveau du sous-sol.};
\draw[thin] (0,-17) -- (50,-17); \foreach \i in {0,10,...,50} \draw[thin] (\i,-17) -- (\i,-16.2);
\node[tiny,anchor=west] at (51,-17) {50 ft};
\end{tikzpicture}
"""

PRE = r"""\documentclass[10pt,a4paper]{article}
\usepackage[margin=1.5cm,top=1.4cm,bottom=1.6cm]{geometry}
\usepackage{fontspec}
% Police : EB Garamond, comme le roman (TeX Live : paquet ebgaramond ; Arch : texlive-fontsextra).
\IfFontExistsTF{EB Garamond}{\setmainfont{EB Garamond}[Ligatures=TeX]}%
  {\setmainfont{EBGaramond}[Extension=.otf, UprightFont=*-Regular, ItalicFont=*-Italic, BoldFont=*-SemiBold, BoldItalicFont=*-SemiBoldItalic, Ligatures=TeX]}
\newcommand{\caps}[1]{{\addfontfeature{LetterSpace=8}\fontsize{0.82em}{1em}\selectfont\MakeUppercase{#1}}}
\usepackage{xcolor}
\usepackage{tikz}
\usetikzlibrary{patterns}
\usepackage{enumitem}
\usepackage{microtype}
\frenchspacing
\setlength{\parindent}{0pt}\setlength{\parskip}{4pt}
\definecolor{wallc}{HTML}{2B2A33}
\definecolor{cRec}{HTML}{F1DDB8}
\definecolor{cFam}{HTML}{D6E4D9}
\definecolor{cSrv}{HTML}{DADBDF}
\definecolor{cCir}{HTML}{FAF8F3}
\definecolor{cExt}{HTML}{E7EEF3}
\definecolor{cSan}{HTML}{D9E3EF}
\definecolor{cGarden}{HTML}{CFE2C4}
\definecolor{accent}{HTML}{8A5A1F}
\tikzset{
  rec/.style={fill=cRec}, fam/.style={fill=cFam}, srv/.style={fill=cSrv}, cir/.style={fill=cCir},
  ext/.style={fill=cExt}, san/.style={fill=cSan}, garden/.style={fill=cGarden},
  road/.style={fill=cSrv!70}, pave/.style={fill=cSrv!40}, earth/.style={fill=accent!25},
  wall/.style={draw=wallc, line width=0.7pt}, extwall/.style={draw=wallc!60, line width=0.4pt, dashed},
  outer/.style={draw=wallc, line width=1.6pt},
  tread/.style={draw=wallc!55, line width=0.3pt}, stair/.style={draw=wallc, line width=0.4pt, fill=cCir},
  jamb/.style={draw=wallc, line width=0.5pt}, fold/.style={draw=wallc, line width=0.5pt, dash pattern=on 1.2pt off 1.2pt},
  lab/.style={font=\fontsize{6.2}{7.2}\selectfont, align=center, inner sep=0pt},
  tiny/.style={font=\fontsize{5.6}{6.4}\selectfont, inner sep=0.5pt},
  numtag/.style={font=\fontsize{5.6}{6.4}\selectfont\bfseries, fill=white, inner sep=0.8pt, rounded corners=0.6pt},
}
\newlist{descr}{description}{1}
\setlist[descr]{font=\normalfont, leftmargin=2.2em, labelwidth=1.9em, labelsep=0.3em, itemsep=2.5pt, parsep=0pt, topsep=2pt}
\newcommand{\legende}{%
\begin{tikzpicture}[x=1cm,y=1cm]
\foreach \c/\t [count=\i from 0] in {rec/Réception, fam/Famille et invités, srv/Service, san/Toilette et bains, cir/Circulation, ext/Extérieur et vides}{
  \fill[\c] ({mod(\i,3)*5.2},{-int(\i/3)*0.5}) rectangle +(0.45,0.3); \draw[wall] ({mod(\i,3)*5.2},{-int(\i/3)*0.5}) rectangle +(0.45,0.3);
  \node[anchor=west,font=\small] at ({mod(\i,3)*5.2+0.55},{-int(\i/3)*0.5+0.15}) {\t};
}
\end{tikzpicture}}
\newcommand{\niveau}[1]{\par\noindent{\color{accent}\fontsize{17}{20}\selectfont\itshape #1}\par\vspace{2pt}}
\begin{document}
"""

def build():
    out = [PRE]
    out.append(r"""{\color{accent}\fontsize{26}{30}\selectfont\itshape La maison Whitmore}\par
{\large Belgravia, Londres — plans de travail, novembre 1890}\par\vspace{6pt}
Grande maison de ville mitoyenne d'un \emph{terrace} de Belgravia, en stuc blanc. Le plan suit le modèle d'une bonne maison londonienne publié par Robert Kerr dans \emph{The Gentleman's House} (3\textsuperscript{e} éd., 1871, pl.~XLII), un peu élargi : 36~ft de façade (11~m) au lieu de 32~ft~½, que Kerr tient pour le minimum d'une « really good house ». La parcelle fait environ 146~ft de profondeur (44,5~m), écuries comprises.

\textbf{Principes d'organisation.} Deux escaliers desservent la maison : le grand escalier pour la famille et les invités, l'escalier de service et son monte-charge pour les domestiques, du sous-sol aux combles. Les pièces de réception sont au rez-de-chaussée et au premier étage, les chambres au-dessus, les domestiques en bas et sous les toits. Éclairage au gaz, cheminées à charbon dans toutes les pièces, salles de bain à eau chaude : une maison riche et moderne de 1890.

\textbf{Conventions.} Unités en pieds anglais (1~ft $\approx$ 0,305~m). Sur chaque plan, la rue est en bas et le jardin en haut. Les cotes sont indicatives : elles servent à garder des volumes cohérents, pas à construire. Les descriptions restent générales et seront affinées scène par scène.

\vspace{4pt}\legende\par\vspace{8pt}
""")
    out.append(SITE)
    out.append(r"\par\vspace{10pt}")
    out.append(SECTION)
    out.append(r"""\par\vspace{6pt}
\textbf{Hauteurs sous plafond (ordres de grandeur).} Sous-sol 11~ft (3,35~m) ; rez-de-chaussée 14~ft (4,25~m) ; premier étage 16~ft (4,90~m), le plus haut, car c'est l'étage de réception ; deuxième 12~ft (3,65~m) ; troisième 10~ft (3,05~m) ; combles 8~ft (2,45~m). Le rez-de-chaussée est surélevé de quelques marches par rapport à la rue ; le sous-sol est à demi enterré.
""")
    for L in LEVELS:
        out.append(r"\newpage")
        out.append(r"\niveau{%s}" % L["title"])
        out.append(r"{\small\textit{Hauteur : %s.}}\par" % L["height"])
        out.append(r"{\small %s}\par\vspace{4pt}" % esc(L["intro"]))
        out.append(r"\noindent\begin{minipage}[t]{8.75cm}\vspace{0pt}")
        out.append(plan_tikz(L))
        out.append(r"\end{minipage}\hfill\begin{minipage}[t]{8.95cm}\vspace{0pt}\fontsize{8.4}{10.2}\selectfont")
        out.append(desc_block(L))
        out.append(r"\end{minipage}")
    out.append(r"""\newpage
\niveau{Sources et repères}
\begin{itemize}[leftmargin=1.2em,itemsep=3pt]
\item Robert Kerr, \emph{The Gentleman's House}, 3\textsuperscript{e} éd., 1871, pl.~XLII, « Design for London Houses » : répartition des pièces par étage, monte-charge dans l'escalier de service, écuries sur la ruelle arrière. Texte reproduit sur \emph{Victorian London} (victorianlondon.org, « A London Town House »).
\item Belgrave Square : terraces dessinés par George Basevi pour Lord Grosvenor dans les années 1820, maisons en stuc blanc, occupées pour la plupart vers 1840 (Wikipédia, « Belgrave Square »).
\item Équipements : salles de bain fixes à eau chaude et froide dans les grandes maisons après 1870 ; cuvette de WC tout en céramique présentée en 1884 ; manchon à incandescence Welsbach à partir de 1885 ; électricité dans une partie de Kensington dès 1887, mais encore très rare (UWE, « Victorian \& Edwardian Services (Houses) 1850--1914 »).
\item Références de décor possibles : 18 Stafford Terrace (Kensington), maison d'Edward Linley Sambourne, conservée avec son intérieur des années 1870--1900.
\end{itemize}

\textbf{Choix ouverts.} Le square exact, la décoration de chaque pièce, l'éclairage (gaz seul, ou électricité dans les salons, ce qui serait un luxe rare), la position précise des horloges et le nombre de domestiques présents ce soir. Personnel supposé : majordome, deux valets de pied, cuisinière, fille de cuisine, fille d'arrière-cuisine, deux femmes de chambre, la femme de chambre de Lady Whitmore, un cocher et un palefrenier aux écuries. Mrs.~Hartwell, l'intendante, est au manoir avec Lord Whitmore.
\end{document}
""")
    return "\n".join(out)

if __name__ == "__main__":
    import sys
    open(sys.argv[1], "w", encoding="utf8").write(build())
