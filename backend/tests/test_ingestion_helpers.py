"""Offline tests for the NCERT ingestion helpers (no PDFs or network needed)."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from krutidev import krutidev_to_unicode, looks_like_krutidev  # noqa: E402
from ncert_pdf import parse_filename  # noqa: E402


@pytest.mark.parametrize("kruti,unicode_", [
    ("fxYyw", "गिल्लू"),                                       # short-i before a conjunct
    ("Le`fr", "स्मृति"),
    ("esjk NksVk&lk futh iqLrdky;", "मेरा छोटा-सा निजी पुस्तकालय"),
    ("dYyw oqQEgkj dh mukdksVh", "कल्लू कुम्हार की उनाकोटी"),   # NCERT's oqQ = कु
    (",ojsLV%esjh f'k[kj ;k=kk", "एवरेस्टःमेरी शिखर यात्रा"),
    ("egknsoh oekZ", "महादेवी वर्मा"),                          # reph after the syllable
    ("dk;Z", "कार्य"),
    ("fiQj", "फिर"),                                           # NCERT's iQ = फ
    ("/hjs&/hjs", "धीरे-धीरे"),                                  # NCERT's / = ध
    ("fxYyw/1", "गिल्लू/1"),                                    # page marker keeps its slash
    ("blosQ ckn", "इसके बाद"),
])
def test_krutidev_to_unicode(kruti, unicode_):
    assert krutidev_to_unicode(kruti) == unicode_


def test_detects_krutidev_but_not_unicode_or_english():
    assert looks_like_krutidev("lksutqgh esa vkt ,d ihyh dyh yxh gSA bls ns[kdj")
    assert not looks_like_krutidev("गिल्लू महादेवी वर्मा")
    assert not looks_like_krutidev("The cell is the basic unit of life.")


@pytest.mark.parametrize("name,subject,number,label", [
    ("9-Sci-5.pdf", "Science", 5, None),
    ("9-Eng-Beehive-2.pdf", "English", 2, None),
    ("9-PoliticalScience-3.pdf", "Social Science", 3, None),
    ("9-Math-Appendix1.pdf", "Mathematics", None, "Appendix 1"),
    ("9-Math-Answers.pdf", "Mathematics", None, "Answers"),
    ("iesc1an.pdf", "Science", None, "Answers"),
])
def test_parse_filename(name, subject, number, label):
    meta = parse_filename(Path(name))
    assert (meta["subject"], meta["number"], meta["label"]) == (subject, number, label)


def test_fastembed_provider_adds_nomic_prefixes(monkeypatch):
    """Queries and passages must carry nomic's task prefixes, or stored and live vectors won't match."""
    import asyncio

    import numpy as np

    import app.rag.embedder as emb

    seen = []

    class FakeModel:
        def embed(self, texts, batch_size=16):
            seen.extend(texts)
            return [np.zeros(emb.EMBED_DIM) for _ in texts]

    monkeypatch.setattr(emb, "provider_name", lambda: "fastembed")
    monkeypatch.setattr(emb, "_fastembed", lambda: FakeModel())
    asyncio.run(emb.embed_text("what is a cell?"))
    asyncio.run(emb.embed_batch(["The cell is the unit of life."]))
    assert seen == ["search_query: what is a cell?", "search_document: The cell is the unit of life."]
