"""
Kruti Dev 010 → Unicode Devanagari.

NCERT's Hindi PDFs (Sparsh, Sanchayan) use the legacy Kruti Dev font, so
text extraction yields ASCII soup like "fxYyw" instead of "गिल्लू".
This is the standard substitution table plus the two reorderings Kruti Dev
needs: the short-i matra (f) is typed before its consonant, and the reph
(Z, र्) is typed after its syllable.
"""
import re

# Private-use placeholders for characters that need reordering after mapping.
SHORT_I, REPH, SLASH, RPAREN = "\uf000", "\uf001", "\uf002", "\uf003"

# Ordered: longer sequences first.
_PAIRS = [
    ("ñ", "॰"), ("sas", "ें"), ("aa", "ं"),
    # NCERT's variant writes क as "oQ" (osQ = के, oqQ = कु, oSQ = कै)
    ("oqQ", "कु"), ("owQ", "कू"), ("osQ", "के"), ("oSQ", "कै"), ("oaQ", "कं"), ("oQ", "क"), ("iQ", "फ"),
    ("‘", '"'), ("’", '"'), ("“", "'"), ("”", "'"),
    ("å", "०"), ("ƒ", "१"), ("„", "२"), ("…", "३"), ("†", "४"), ("‡", "५"), ("ˆ", "६"), ("‰", "७"), ("Š", "८"), ("‹", "९"),
    ("¶+", "फ़्"), ("d+", "क़"), ("[+k", "ख़"), ("[+", "ख़्"), ("x+", "ग़"), ("T+", "ज़्"), ("t+", "ज़"),
    ("M+", "ड़"), ("<+", "ढ़"), ("Q+", "फ़"), (";+", "य़"), ("j+", "ऱ"), ("u+", "ऩ"),
    ("Ùk", "त्त"), ("Ù", "त्त्"), ("Dr", "क्त"), ("–", "दृ"), ("—", "कृ"), ("é", "न्न"), ("™", "न्न्"),
    ("=kk", "त्रा"), ("=k", "त्र"),
    ("à", "ह्न"), ("á", "ह्य"), ("â", "हृ"), ("ã", "ह्म"), ("ºz", "ह्र"), ("º", "ह्"), ("í", "द्द"),
    ("{k", "क्ष"), ("{", "क्ष्"), ("=", "त्र"), ("«", "त्र्"),
    ("Nî", "छ्य"), ("Vî", "ट्य"), ("Bî", "ठ्य"), ("Mî", "ड्य"), ("<î", "ढ्य"), ("|", "द्य"), ("K", "ज्ञ"), ("}", "द्व"),
    ("J", "श्र"), ("Vª", "ट्र"), ("Mª", "ड्र"), ("<ªª", "ढ्र"), ("Nª", "छ्र"), ("Ø", "क्र"), ("Ý", "फ्र"),
    ("nzZ", "र्द्र"), ("æ", "द्र"), ("ç", "प्र"), ("Á", "प्र"), ("xz", "ग्र"), ("#", "रु"), (":", "रू"),
    ("v‚", "ऑ"), ("vks", "ओ"), ("vkS", "औ"), ("vk", "आ"), ("v", "अ"), ("b±", "ईं"), ("Ã", "ई"), ("bZ", "ई"),
    ("b", "इ"), ("m", "उ"), ("Å", "ऊ"), (",s", "ऐ"), (",", "ए"), ("_", "ऋ"),
    ("ô", "क्क"), ("d", "क"), ("Dk", "क"), ("D", "क्"), ("[k", "ख"), ("[", "ख्"), ("x", "ग"), ("Xk", "ग"), ("X", "ग्"),
    ("Ä", "घ"), ("?k", "घ"), ("?", "घ्"), ("³", "ङ"),
    ("pkS", "चै"), ("p", "च"), ("Pk", "च"), ("P", "च्"), ("N", "छ"), ("t", "ज"), ("Tk", "ज"), ("T", "ज्"),
    (">", "झ"), ("÷", "झ्"), ("¥", "ञ"),
    ("ê", "ट्ट"), ("ë", "ट्ठ"), ("V", "ट"), ("B", "ठ"), ("ì", "ड्ड"), ("ï", "ड्ढ"), ("M", "ड"), ("<", "ढ"),
    (".k", "ण"), (".", "ण्"),
    ("r", "त"), ("Rk", "त"), ("R", "त्"), ("Fk", "थ"), ("F", "थ्"), (")", "द्ध"), ("n", "द"),
    # NCERT writes a full ध as "/" (/hjs = धीरे)
    ("èk", "ध"), ("/", "ध"), ("Ë", "ध्"), ("è", "ध्"), ("u", "न"), ("Uk", "न"), ("U", "न्"),
    ("i", "प"), ("Ik", "प"), ("I", "प्"), ("Q", "फ"), ("¶", "फ्"), ("c", "ब"), ("Ck", "ब"), ("C", "ब्"),
    ("Hk", "भ"), ("H", "भ्"), ("e", "म"), ("Ek", "म"), ("E", "म्"),
    (";", "य"), ("¸", "य्"), ("j", "र"), ("y", "ल"), ("Yk", "ल"), ("Y", "ल्"), ("G", "ळ"), ("o", "व"), ("Ok", "व"), ("O", "व्"),
    ("'k", "श"), ("'", "श्"), ('"k', "ष"), ('"', "ष्"), ("l", "स"), ("Lk", "स"), ("L", "स्"), ("g", "ह"),
    ("È", "ीं"), ("z", "्र"),
    ("Ì", "द्द"), ("Í", "ट्ट"), ("Î", "ट्ठ"), ("Ï", "ड्ड"), ("Ñ", "कृ"), ("Ò", "भ"), ("Ó", "्य"), ("Ô", "ड्ढ"),
    ("Ö", "झ्"), ("Ü", "श्"), ("Ük", "श"),
    ("‚", "ॉ"), ("ks", "ो"), ("kS", "ौ"), ("k", "ा"), ("h", "ी"), ("q", "ु"), ("w", "ू"), ("`", "ृ"), ("s", "े"), ("S", "ै"),
    ("a", "ं"), ("¡", "ँ"), ("%", "ः"), ("W", "ॅ"), ("•", "ऽ"), ("·", "ऽ"), ("~j", "्र"), ("~", "्"), ("\\", "?"), ("+", "़"),
    ("^", "‘"), ("*", "’"), ("Þ", "“"), ("ß", "”"), ("¼", "("), ("½", ")"), ("¿", "{"), ("À", "}"), ("¾", "="),
    ("A", "।"), ("&", "-"), ("Œ", "॰"), ("]", ","), ("@", "/"),
]
# Single-pass longest-match tokenizer (avoids re-substituting output).
_KEYS = sorted({k for k, _ in _PAIRS}, key=len, reverse=True)
_MAP = {}
for k, v in _PAIRS:
    _MAP.setdefault(k, v)
_TOKEN = re.compile("|".join(re.escape(k) for k in _KEYS))

_MATRAS = "ािीुूृेैोौंँः़ॅ"
_CONSONANT = re.compile("[\\u0915-\\u0939\\u0958-\\u095F]")


def _fix_short_i(s: str) -> str:
    """'f' placeholder (ि) comes before its consonant cluster in Kruti Dev; move it after."""
    out = list(s)
    i = 0
    while i < len(out):
        if out[i] == SHORT_I:
            j = i + 1
            # consume consonant (+ nukta) and any halant-joined consonants
            while j < len(out):
                if _CONSONANT.match(out[j]):
                    j += 1
                    if j < len(out) and out[j] == "़":
                        j += 1
                    if j < len(out) and out[j] == "्" and j + 1 < len(out) and _CONSONANT.match(out[j + 1]):
                        j += 1
                        continue
                    break
                else:
                    break
            out[i:j] = out[i + 1:j] + ["ि"]
            i = j
        else:
            i += 1
    return "".join(out)


def _fix_reph(s: str) -> str:
    """'Z' placeholder (र्) is typed after its syllable; move it before the consonant cluster."""
    out = list(s)
    i = 0
    while i < len(out):
        if out[i] == REPH:
            j = i - 1
            while j >= 0 and out[j] in _MATRAS:
                j -= 1
            # back over the consonant and any halant-joined consonants before it
            while j >= 2 and out[j - 1] == "्" and _CONSONANT.match(out[j - 2]):
                j -= 2
            j = max(j, 0)
            del out[i]
            out[j:j] = ["र", "्"]
            i += 2
        else:
            i += 1
    return "".join(out)


def _protect_closing_parens(text: str) -> str:
    out = []
    for line in text.split("\n"):
        depth, chars = 0, []
        for ch in line:
            if ch == "(":
                depth += 1
            elif ch == ")" and depth:
                depth -= 1
                ch = RPAREN
            chars.append(ch)
        out.append("".join(chars))
    return "\n".join(out)


def krutidev_to_unicode(text: str) -> str:
    # Page markers like "fxYyw/1" or "64/Li'kZ" keep their slash.
    text = re.sub(r"/(?=\d)|(?<=\d)/", SLASH, text)
    # NCERT's font uses literal parentheses: a ")" that closes an open "(" on the
    # same line is punctuation, not the द्ध ligature.
    text = _protect_closing_parens(text)
    # Protect the two reordering markers before the table runs.
    text = text.replace("f", SHORT_I).replace("Z", REPH)
    text = _TOKEN.sub(lambda m: _MAP[m.group(0)], text)
    text = _fix_short_i(text)
    text = _fix_reph(text)
    text = text.replace(SLASH, "/").replace(RPAREN, ")")
    # PDF extraction sometimes splits a vowel sign from its consonant with a space.
    return re.sub(r" +([\u0900-\u0903\u093A-\u094F\u0962\u0963])", r"\1", text)


def looks_like_krutidev(text: str) -> bool:
    """Hindi PDFs come out as ASCII with these telltale clusters and almost no Devanagari."""
    if re.search(r"[\u0900-\u097F]", text):
        return False
    return len(re.findall(r"(?:ks|kS|esa|gS|dk|fd|\bvkSj\b|ugha)", text)) >= 3
