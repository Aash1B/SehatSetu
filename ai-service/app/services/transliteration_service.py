"""Small offline Hindi transliteration adapter; preserves Latin medical terms."""
from __future__ import annotations
from typing import Protocol

class TransliterationAdapter(Protocol):
    def romanize_hindi(self,text: str) -> str: ...

_INDEPENDENT={"अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo","ए":"e","ऐ":"ai","ओ":"o","औ":"au"}
_CONSONANTS={"क":"k","ख":"kh","ग":"g","घ":"gh","च":"ch","छ":"chh","ज":"j","झ":"jh","ट":"t","ठ":"th","ड":"d","ढ":"dh","त":"t","थ":"th","द":"d","ध":"dh","न":"n","प":"p","फ":"ph","ब":"b","भ":"bh","म":"m","य":"y","र":"r","ल":"l","व":"v","श":"sh","ष":"sh","स":"s","ह":"h"}
_MATRAS={"ा":"aa","ि":"i","ी":"ee","ु":"u","ू":"oo","े":"e","ै":"ai","ो":"o","ौ":"au","ृ":"ri"}

class OfflineHindiTransliterator:
    """Conservative readable transliteration, not a translation engine."""
    def romanize_hindi(self,text: str) -> str:
        out=[]; chars=list(text)
        for i,char in enumerate(chars):
            if char in _INDEPENDENT: out.append(_INDEPENDENT[char])
            elif char in _CONSONANTS:
                out.append(_CONSONANTS[char])
                following=chars[i+1] if i+1<len(chars) else ""
                if following not in _MATRAS and following!="्": out.append("a")
            elif char in _MATRAS: out.append(_MATRAS[char])
            elif char=="्":
                if out and out[-1]=="a": out.pop()
            elif char=="ं": out.append("n")
            elif char=="ँ": out.append("n")
            elif char=="ः": out.append("h")
            elif char=="।": out.append(".")
            else: out.append(char)
        return " ".join("".join(out).split())

transliteration_service=OfflineHindiTransliterator()
