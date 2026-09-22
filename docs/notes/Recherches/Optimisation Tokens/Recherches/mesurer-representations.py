import argparse
from collections import Counter
import hashlib
import importlib.metadata
import json
from pathlib import Path
import re

import tiktoken


def serialiser(valeur):
    return json.dumps(valeur, ensure_ascii=False, separators=(",", ":"))


def chaines(valeur):
    if isinstance(valeur, str):
        yield valeur
    elif isinstance(valeur, dict):
        for enfant in valeur.values():
            yield from chaines(enfant)
    elif isinstance(valeur, list):
        for enfant in valeur:
            yield from chaines(enfant)


def traduire(valeur, table):
    if isinstance(valeur, str):
        return table.get(valeur, valeur)
    if isinstance(valeur, dict):
        return {cle: traduire(enfant, table) for cle, enfant in valeur.items()}
    if isinstance(valeur, list):
        return [traduire(enfant, table) for enfant in valeur]
    return valeur


def dictionnaire(contrat):
    occurrences = Counter(chaines(contrat))
    assert not any(re.fullmatch(r"~\d+", texte) for texte in occurrences)
    references = [texte for texte, nombre in occurrences.items()
                  if nombre > 1 and re.fullmatch(r"\{[^{}]+\}", texte)]
    codes = {texte: f"~{index}" for index, texte in enumerate(references)}
    forme = {"dictionary": references, "document": traduire(contrat, codes)}
    inverse = {code: texte for texte, code in codes.items()}
    assert traduire(forme["document"], inverse) == contrat
    return forme


def colonnes(contrat):
    lignes = contrat["variants"]
    cles = list(dict.fromkeys(cle for ligne in lignes for cle in ligne))
    catalogues = []
    indices = []
    for cle in cles:
        catalogue = []
        index = {}
        for ligne in lignes:
            if cle in ligne:
                signature = serialiser(ligne[cle])
                if signature not in index:
                    index[signature] = len(catalogue)
                    catalogue.append(ligne[cle])
        catalogues.append(catalogue)
        indices.append(index)
    cellules = [[indices[i][serialiser(ligne[cle])] if cle in ligne else -1
                 for i, cle in enumerate(cles)] for ligne in lignes]
    matrice = {"keys": cles, "catalogs": catalogues, "rows": cellules}
    forme = {**contrat, "variants": matrice}
    retour = [{cle: catalogues[i][ligne[i]]
               for i, cle in enumerate(cles) if ligne[i] != -1}
              for ligne in cellules]
    assert {**forme, "variants": retour} == contrat
    return forme


def mesurer(racine):
    encodeurs = {nom: tiktoken.get_encoding(nom)
                 for nom in ("cl100k_base", "o200k_base")}
    retraits = {"variants", "viewStructures", "viewPaintPlacements",
                "viewTypographies", "viewIcons", "samples"}
    resultats = []
    for nom in ("Alert", "Button", "StressTest", "TileLink"):
        chemin = racine / "src" / "components" / nom / f"{nom}.contract.json"
        octets = chemin.read_bytes()
        original = octets.decode("utf-8-sig")
        contrat = json.loads(original)
        reste = {cle: valeur for cle, valeur in contrat.items() if cle not in retraits}
        reserve = {cle: valeur for cle, valeur in contrat.items() if cle in retraits}
        assert {**reste, **reserve} == contrat
        formes = {"original": original,
                  "minifie": serialiser(contrat),
                  "dictionnaire": serialiser(dictionnaire(contrat)),
                  "colonnes": serialiser(colonnes(contrat)),
                  "colonnes_dictionnaire": serialiser(dictionnaire(colonnes(contrat))),
                  "reste_plan_non_autosuffisant": serialiser(reste)}
        mesures = {cle: {"octets_utf8": len(texte.encode("utf-8")),
                         **{nom_enc: len(enc.encode(texte, disallowed_special=()))
                            for nom_enc, enc in encodeurs.items()}}
                   for cle, texte in formes.items()}
        resultats.append({"composant": nom,
                          "source": chemin.relative_to(racine).as_posix(),
                          "sha256": hashlib.sha256(octets).hexdigest(),
                          "version_contrat": contrat["meta"]["contractVersion"],
                          "variants": len(contrat["variants"]),
                          "aller_retour_verifie": True,
                          "mesures": mesures})
    return {"tiktoken": importlib.metadata.version("tiktoken"),
            "script_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            "encodages": list(encodeurs),
            "appels_modele": 0,
            "resultats": resultats}


if __name__ == "__main__":
    arguments = argparse.ArgumentParser()
    arguments.add_argument("playground", type=Path)
    arguments.add_argument("--out", type=Path, required=True)
    options = arguments.parse_args()
    resultat = mesurer(options.playground)
    options.out.write_text(json.dumps(resultat, ensure_ascii=False, indent=2) + "\n",
                           encoding="utf-8")
    print(json.dumps(resultat, ensure_ascii=False, indent=2))
