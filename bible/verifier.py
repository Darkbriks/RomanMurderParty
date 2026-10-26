#!/usr/bin/env python3
"""Vérifie la cohérence des données de la bible : YAML lisible, identifiants de personnages connus.

Usage : python3 bible/verifier.py        (code de sortie 1 en cas d'erreur ; utilisable en CI)
Dépendance : PyYAML (pip install pyyaml).
"""
import pathlib
import sys

import yaml

ICI = pathlib.Path(__file__).resolve().parent
D = ICI / "donnees"
erreurs = []


def charger(nom):
    try:
        return yaml.safe_load((D / nom).read_text(encoding="utf8"))
    except Exception as e:  # noqa: BLE001
        erreurs.append(f"{nom} : YAML illisible ({e})")
        return None


def ids_de(valeur):
    """Accepte un ID, une liste d'ID, ou « suit:ID »."""
    if valeur is None:
        return []
    if isinstance(valeur, list):
        return [v for x in valeur for v in ids_de(x)]
    return [str(valeur)]


perso = charger("personnages.yaml")
if perso is None:  # sans la liste des identifiants, les autres contrôles ne font que du bruit
    print("\n".join(erreurs))
    sys.exit(1)
IDS = {p["id"] for p in perso.get("personnages", [])} | {p["id"] for p in perso.get("absents_et_figurants", [])}
SPECIAUX = {"tous"}


def verifier_ids(fichier, contexte, valeurs):
    for v in ids_de(valeurs):
        if v not in IDS and v not in SPECIAUX:
            erreurs.append(f"{fichier} : identifiant inconnu {v!r} ({contexte})")


rel = charger("relations.yaml") or {}
vus = set()
for i, r in enumerate(rel.get("relations", [])):
    verifier_ids("relations.yaml", f"entrée {i}", [r.get("de"), r.get("vers")])
    if r.get("valence") not in (-2, -1, 0, 1, 2):
        erreurs.append(f"relations.yaml : valence hors bornes à l'entrée {i}")
    cle = (r.get("de"), r.get("vers"))
    if cle in vus:
        erreurs.append(f"relations.yaml : doublon {cle}")
    vus.add(cle)

chrono = charger("chronologie.yaml") or {}
phases = {p["id"] for p in chrono.get("phases", [])}
groupes = {g["id"] for g in chrono.get("groupes", []) if isinstance(g, dict) and "id" in g}
for i, e in enumerate(chrono.get("evenements", [])):
    for q in ids_de(e.get("qui")):
        if q not in IDS and q not in groupes and q not in SPECIAUX:
            erreurs.append(f"chronologie.yaml : « qui » inconnu {q!r} (événement {i})")
    for ph in ids_de(e.get("phase")):
        if ph not in phases:
            erreurs.append(f"chronologie.yaml : phase inconnue {ph!r} (événement {i})")
    if e.get("statut") not in ("decide", "piste", "propose"):
        erreurs.append(f"chronologie.yaml : statut invalide à l'événement {i}")

for it in (charger("intrigues.yaml") or {}).get("intrigues", []):
    for champ in ("au_coeur", "soupconnent", "narrateurs"):
        verifier_ids("intrigues.yaml", f"{it.get('id')}.{champ}", it.get(champ))

inv = charger("invitations.yaml") or {}
for x in inv.get("invites", []):
    verifier_ids("invitations.yaml", "qui", x.get("qui"))

vote = charger("vote.yaml") or {}
for v in vote.get("votes", []):
    verifier_ids("vote.yaml", "qui", v.get("qui"))
    if str(v.get("vote", "")).startswith("suit:"):
        verifier_ids("vote.yaml", "suit", v["vote"][5:])

charger("reperes-historiques.yaml")

maison = ICI / "lieu" / "maison.yaml"
try:
    m = yaml.safe_load(maison.read_text(encoding="utf8"))
    nums = [p["num"] for n in m["niveaux"] for p in n["pieces"]]
    doublons = {n for n in nums if nums.count(n) > 1}
    if doublons:
        erreurs.append(f"lieu/maison.yaml : numéros de pièce en double {sorted(doublons)}")
except Exception as e:  # noqa: BLE001
    erreurs.append(f"lieu/maison.yaml : illisible ({e})")

if erreurs:
    print("\n".join(erreurs))
    sys.exit(1)
print(f"Bible cohérente : {len(IDS)} identifiants, {len(vus)} relations, "
      f"{len(chrono.get('evenements', []))} événements.")
