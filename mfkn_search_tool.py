import requests
import re
import json
from typing import List, Optional, Dict, Tuple


class Tools:
    """
    mfknSearch – søgeværktøj til Miljø- og Fødevareklagenævnet (MFKN).

    Standard:
      mfknSearch(query="...", page=1)

    Avanceret (kan kaldes fra prompt/systeminstruktion):
      mfknSearch(
          query="bevisbyrde § 72 MBL",
          page=1,
          types=["ruling"],                # eller ["news"]
          lovomraader=["Miljøbeskyttelsesloven"],
      )
    """

    def __init__(self):
        self.name = "mfknSearch"
        self.description = (
            "Søger i Miljø- og Fødevareklagenævnets afgørelsesportal "
            "mfkn.naevneneshus.dk via /api/search. Understøtter lovområder, "
            "§-henvisninger og fagord med boolsk søgning."
        )

        self.base_url = "https://mfkn.naevneneshus.dk"
        self.endpoint = f"{self.base_url}/api/search"
        # MFKN UI defaulter til 10 resultater per side
        self.page_size = 10
        self.wildcard = "*"

        # ========= DEBUG =========
        # Slå fra i produktion:
        #   self.debug = False
        self.debug = True
        # =========================

        # ================== KATEGORIER FRA /api/SiteSettings ==================
        # title -> id
        self.category_ids: Dict[str, str] = {
            "Aktindsigt": "bf0f26f7-3afe-459d-a4af-2f55a21efce7",
            "Dyresundhed og –velfærd": "c7c7cde2-9a5c-4856-be80-efedbe82d920",
            "Dyrlægelov": "c82028b9-34f4-47c2-bb77-eb49480530ff",
            "Fiskeri": "662382ec-10c0-4c12-a732-90e263121e47",
            "Foder": "236fcd23-83ed-4120-a5d2-5258d0717fdb",
            "Fredning mv.": "1805a1fe-2c50-41bb-9db6-4355c7f7f2c5",
            "Fødevarer": "4a9c3924-1632-4fb0-8d13-fc1b4969027d",
            "Havmiljøloven": "87a6b34d-e6de-4ab9-b787-7884b4ccbd4d",
            "Husdyrbrugloven": "15fb3eac-8420-4c96-8005-168c54234680",
            "Jordforureningsloven": "15439758-bad4-442a-8b00-dfc9a94f62e3",
            "Krydsoverensstemmelse": "0dd7b583-46dd-4aaa-9b27-04661f4299d5",
            "Kystbeskyttelsesloven": "42f6c073-58ef-44c7-8c1d-3654e7acac3e",
            "Landbrugsloven": "41b34909-1048-43d3-b13b-a8ec3fca34d9",
            "Landbrugsstøtte": "acd08b28-e7bd-4fdb-bd53-2e398c6c206a",
            "Miljøbeskyttelsesloven": "b87c174f-b78f-4a71-8344-f9049566f3fb",
            "Miljømålsloven og vandplanlægningsloven": "462d19b0-c662-44ab-ae52-5826e3cc7b7b",
            "Miljøvurdering af konkrete projekter": "36c77223-f646-4aee-823a-095f84e979d6",
            "Miljøvurdering af planer og programmer": "8aff4a0d-edca-4ec5-848a-50b5ca224938",
            "Museumsloven": "c2708c5c-b18c-40aa-8217-c4da2625bfc4",
            "NBL - beskyttede naturtyper": "65a6d80e-f89c-4575-9147-4aa8f50344be",
            "NBL - beskyttelseslinier": "615ed5e3-eb89-4502-a0d0-3f5909907972",
            "NBL - fredningsområdet": "d1981265-0e9c-4afc-83bd-aec6503d8d25",
            "NBL - øvrige": "fffc6e80-73f0-48ea-8af2-387bdceb46e6",
            "Planter": "bc755faa-a3ac-4f22-8306-8dc97c24fa94",
            "Projektstøtte": "fe41cdf7-2fce-42d8-a88b-6aaa45a4b9f9",
            "Råstofloven": "29e672b5-9460-48cd-b352-00df5c7e8a1c",
            "Skovloven": "a6c4ef83-6035-4f25-9cfd-206ba3b22943",
            "Vandforsyningsloven": "5082bcee-b3ce-4a75-b615-0b76c7dc4bed",
            "Vandløbsloven": "6fc0d44d-2f3f-4e14-bf25-94059f349509",
            "Økologi": "991b2673-ce43-493c-a929-070f7bb0a78e",
            "Øvrige lovområder": "02af2fab-2fe5-44fd-8d31-c2163a3a897a",
        }

        # ================== LOV-KEYWORD → KATEGORI-TITLER ==================
        # Hvilke ord i brugerens søgning skal aktivere hvilke lovområder?
        # Værdierne skal være "title" som i category_ids ovenfor.
        self.law_keyword_map: Dict[str, List[str]] = {
            # Miljøbeskyttelsesloven (MBL)
            "mbl": ["Miljøbeskyttelsesloven"],
            "miljøbeskyttelsesloven": ["Miljøbeskyttelsesloven"],
            "miljøbeskyttelse": ["Miljøbeskyttelsesloven"],
            "støj": ["Miljøbeskyttelsesloven"],
            "spildevand": ["Miljøbeskyttelsesloven"],
            "miljøgodkendelse": ["Miljøbeskyttelsesloven"],
            # Jordforureningsloven (JFL)
            "jfl": ["Jordforureningsloven"],
            "jordforureningsloven": ["Jordforureningsloven"],
            "jordforurening": ["Jordforureningsloven"],
            "forurenet jord": ["Jordforureningsloven"],
            "forurenet": ["Jordforureningsloven"],
            # Husdyrbrugloven
            "hbl": ["Husdyrbrugloven"],
            "husdyrbrugloven": ["Husdyrbrugloven"],
            "husdyrbrug": ["Husdyrbrugloven"],
            "ammoniak": ["Husdyrbrugloven"],
            # NBL – fordelt på underkategorier
            "nbl": ["NBL - øvrige"],
            "naturbeskyttelsesloven": ["NBL - øvrige"],
            "naturbeskyttelse": ["NBL - øvrige"],
            "§ 3": ["NBL - beskyttede naturtyper"],
            "§3": ["NBL - beskyttede naturtyper"],
            "beskyttet natur": ["NBL - beskyttede naturtyper"],
            "strandbeskyttelse": ["NBL - beskyttelseslinier"],
            "klitfredning": ["NBL - beskyttelseslinier"],
            "fredning": ["NBL - fredningsområdet"],
            # Vandløbsloven
            "vandløbsloven": ["Vandløbsloven"],
            "vandløb": ["Vandløbsloven"],
            "vll": ["Vandløbsloven"],
            "grødeskæring": ["Vandløbsloven"],
            # Miljøvurdering (MVL/VVM)
            "mvl": [
                "Miljøvurdering af konkrete projekter",
                "Miljøvurdering af planer og programmer",
            ],
            "miljøvurderingsloven": [
                "Miljøvurdering af konkrete projekter",
                "Miljøvurdering af planer og programmer",
            ],
            "vvm": ["Miljøvurdering af konkrete projekter"],
            "screening": ["Miljøvurdering af konkrete projekter"],
            "screeningsafgørelse": ["Miljøvurdering af konkrete projekter"],
            "afværgeforanstaltning": ["Miljøvurdering af konkrete projekter"],
            "afværgeforanstaltninger": ["Miljøvurdering af konkrete projekter"],
            # Øvrige
            "aktindsigt": ["Aktindsigt"],
            "offentlighedsloven": ["Aktindsigt"],
            "miljøoplysningsloven": ["Aktindsigt"],
            "råstofloven": ["Råstofloven"],
            "råstof": ["Råstofloven"],
            "grusgrav": ["Råstofloven"],
            "havmiljøloven": ["Havmiljøloven"],
            "vandforsyningsloven": ["Vandforsyningsloven"],
            "vandforsyning": ["Vandforsyningsloven"],
            "skovloven": ["Skovloven"],
            "skov": ["Skovloven"],
            "fødevarer": ["Fødevarer"],
            "foder": ["Foder"],
            "fiskeri": ["Fiskeri"],
            "dyrevelfærd": ["Dyresundhed og –velfærd"],
            "dyresundhed": ["Dyresundhed og –velfærd"],
            "krydsoverensstemmelse": ["Krydsoverensstemmelse"],
        }

        # ============ FAGORD MED WILDCARD (bruges kun i query) ============
        self.domain_synonyms: Dict[str, str] = {}
        w = self.wildcard

        # Jordforurening / kulbrinter / PFAS
        self.domain_synonyms.update(
            {
                "kulbrinteforurening": f"kulbrinteforuren{w}",
                "kulbrinter": f"kulbrint{w}",
                "olieforurening": f"olieforuren{w}",
                "olieudslip": f"olieudslip{w}",
                "tankstation": f"tankstation{w}",
                "benzinstation": f"benzinstation{w}",
                "pfas": f"pfas{w}",
                "pfos": f"pfos{w}",
                "pfoa": f"pfoa{w}",
                "fluorstof": f"fluorstof{w}",
                "fluorstoffer": f"fluorstof{w}",
                "brandskum": f"brandskum{w}",
            }
        )

        # Affald / planteaffald
        self.domain_synonyms.update(
            {
                "planteaffald": f"planteaffald{w}",
                "haveaffald": f"haveaffald{w}",
                "kompost": f"kompost{w}",
                "deponi": f"deponi{w}",
                "affald": f"affald{w}",
                "genanvendelse": f"genanvend{w}",
            }
        )

        # Stier / adgang
        self.domain_synonyms.update(
            {
                "sti": f"sti{w}",
                "stiforløb": f"stiforløb{w}",
                "nedlæggelse af sti": '"nedlæggelse af sti"',
            }
        )

        # Husdyr / lugt / ammoniak
        self.domain_synonyms.update(
            {
                "staldanlæg": f"staldanlæg{w}",
                "gylle": f"gylle{w}",
                "lugtgener": f"lugtgener{w}",
            }
        )

        # Miljøvurdering / screening
        self.domain_synonyms.update(
            {
                "afværgeforanstaltning": f"afværgeforanstaltning{w}",
                "afværgeforanstaltninger": f"afværgeforanstaltning{w}",
                "miljørapport": f"miljørapport{w}",
            }
        )

    # ============================================================
    # Hjælpefunktioner
    # ============================================================
    def _extract_paragraph(self, token: str) -> Optional[str]:
        """Fanger "§ 72"-henvisninger, også når tallet hænger på ordet."""

        if not token:
            return None

        m = re.search(r"§?\s*(\d+[a-zA-Z]*)", token)
        if m:
            return m.group(1)
        return None

    def _strip_html(self, html: Optional[str]) -> str:
        if not html:
            return ""
        text = re.sub(r"<[^>]+>", " ", html)
        return re.sub(r"\s+", " ", text).strip()

    def _make_summary(self, text: str) -> str:
        """AI-resumé 50–100 ord baseret udelukkende på body."""
        if not text:
            return "ikke oplyst"

        hjemler = re.findall(r"§\s*\d+[a-z]*", text)
        hjemmel_txt = (
            ", ".join(sorted(set(hjemler))) if hjemler else "ingen nævnte bestemmelser"
        )

        lower = text.lower()
        udfald = "ukendt afgørelse"
        if "ophæver" in lower:
            udfald = "ophævelse"
        elif "hjemviser" in lower:
            udfald = "hjemvisning"
        elif "stadfæster" in lower:
            udfald = "stadfæstelse"
        elif "afslag" in lower:
            udfald = "afslag"
        elif "medhold" in lower:
            udfald = "medhold"

        sentences = re.split(r"(?<=[.!?])\s+", text)
        intro = " ".join(sentences[:3]).strip()

        base = (
            f"Sagen vedrører {intro[:250]}. "
            f"Nævnet når frem til {udfald}, med henvisning til {hjemmel_txt}. "
            f"Afgørelsen beskriver sagens faktiske forhold, vurdering og begrundelse."
        )

        words = base.split()
        if len(words) > 100:
            return " ".join(words[:100]) + "..."
        if len(words) < 50:
            return base + " Afgørelsen er kort, men hovedpunkterne fremgår tydeligt."
        return base

    def _unique(self, seq: List[str]) -> List[str]:
        seen = set()
        out: List[str] = []
        for s in seq:
            if s not in seen:
                seen.add(s)
                out.append(s)
        return out

    def _detect_terms(
        self,
        user_query: str,
        explicit_lovomraader: Optional[List[str]],
    ) -> Tuple[List[str], List[str]]:
        q = user_query.lower()

        # Lovområder (kategori-titler)
        law_titles: List[str] = []
        for key, titles in self.law_keyword_map.items():
            if key in q:
                law_titles.extend(titles)

        if explicit_lovomraader:
            law_titles.extend(explicit_lovomraader)

        # Fagord
        domain_terms: List[str] = []
        for key, expr in self.domain_synonyms.items():
            if key in q:
                domain_terms.append(expr)

        return self._unique(law_titles), self._unique(domain_terms)

    def _build_query(
        self,
        user_query: str,
        law_titles: List[str],
        domain_terms: List[str],
    ) -> str:
        """
        Boolsk query, der efterligner UI’et:
        - Lovområder (MBL osv.) kommer IKKE i query, kun i categories
        - Samler "§ 72" osv.
        - Fjerner stopord og søge/praksis-ord
        - Kan senere udvides til at lægge domain_terms ind (OR-blok)
        """

        STOPORD = {
            "og",
            "ved",
            "om",
            "i",
            "på",
            "for",
            "til",
            "med",
            "den",
            "det",
            "der",
            "som",
            "omkring",
            "efter",
            "søgning",
            "søges",
            "søger",
            "praksis",
        }

        tokens = user_query.split()
        cleaned_tokens: List[str] = []
        i = 0

        while i < len(tokens):
            t = tokens[i]
            t_clean = t.strip(".,;:()")
            tl = t_clean.lower()

            if not t_clean:
                i += 1
                continue

            # skip stopord
            if tl in STOPORD:
                i += 1
                continue

            # skip lov-ord (MBL, JFL osv.) i query – de går i categories
            if tl in self.law_keyword_map:
                i += 1
                continue

            # "§" + tal → "§ xx"
            if t_clean == "§" and i + 1 < len(tokens):
                nxt = tokens[i + 1].strip(".,;:()")
                parag = self._extract_paragraph(nxt)
                if parag:
                    cleaned_tokens.append(f'"§ {parag}"')
                    i += 2
                    continue
                else:
                    cleaned_tokens.append('"§"')
                    i += 1
                    continue

            # token der indeholder § direkte
            if "§" in t_clean and t_clean != "§":
                parag = self._extract_paragraph(t_clean)
                if parag:
                    cleaned_tokens.append(f'"§ {parag}"')
                else:
                    cleaned_tokens.append(f'"{t_clean}"')
                i += 1
                continue

            # ord med "praksis" droppes
            if "praksis" in tl:
                i += 1
                continue

            # sammensatte ord → citat
            if "-" in t_clean or "_" in t_clean:
                cleaned_tokens.append(f'"{t_clean}"')
                i += 1
                continue

            cleaned_tokens.append(t_clean)
            i += 1

        base_query = "(" + " AND ".join(cleaned_tokens) + ")" if cleaned_tokens else f"({user_query})"

        # Læg domæneord ind som OR-blok for at efterligne MFKN’s UI-boost
        if domain_terms:
            domain_block = "(" + " OR ".join(domain_terms) + ")"
            return f"({base_query} AND {domain_block})"

        return base_query

    def _format_debug(
        self,
        payload,
        built_query,
        law_titles,
        domain_terms,
        response_data=None,
    ) -> str:
        out = []
        out.append("\n[DEBUG]")
        out.append("Boolsk søgestreng:")
        out.append(built_query)
        out.append("\nLovområder (kategorier):")
        out.append(str(law_titles))
        out.append("\nFagord (boost):")
        out.append(str(domain_terms))
        out.append("\nPayload sendt til API:")
        out.append(json.dumps(payload, indent=2, ensure_ascii=False))
        if response_data is not None:
            out.append("\nResponse (side 1):")
            out.append(json.dumps(response_data, indent=2, ensure_ascii=False))
        return "\n".join(out)

    # ============================================================
    # Hovedfunktion – OpenWebUI kalder altid this.run(...)
    # ============================================================
    def run(
        self,
        query: str,
        page: int = 1,
        types: Optional[List[str]] = None,  # fx ["ruling"], ["news"]
        lovomraader: Optional[List[str]] = None,  # fx ["Miljøbeskyttelsesloven"]
        sort: str = "Score",  # eller "Descending" mv., hvis I ønsker
    ) -> str:

        # 1) detekter lovområder og fagord
        law_titles, domain_terms = self._detect_terms(query, lovomraader)

        # 2) byg query (kun brugerord – lovområder filtreres via categories)
        built_query = self._build_query(query, law_titles, domain_terms)

        # 3) byg categories-listen
        categories = []
        for title in self._unique(law_titles):
            cid = self.category_ids.get(title)
            if cid:
                categories.append({"id": cid, "title": title})

        # 4) typer
        types_payload = types or []

        # 5) skip/size (pagination)
        skip = (page - 1) * self.page_size
        size = self.page_size

        payload = {
            "categories": categories,  # [] hvis ingen lovområde
            "query": built_query,
            "sort": sort,
            "types": types_payload,
            "skip": skip,
            "size": size,
        }

        response_debug_data = None

        # 6) kald API
        try:
            resp = requests.post(self.endpoint, json=payload, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            if self.debug and page == 1:
                response_debug_data = data
        except Exception as e:
            msg = f"Der opstod en fejl: {e}."
            if self.debug:
                msg += self._format_debug(
                    payload, built_query, law_titles, domain_terms
                )
            return msg

        publications = data.get("publications") or []
        total_count = data.get("totalCount", 0)

        debug_block = (
            self._format_debug(
                payload,
                built_query,
                law_titles,
                domain_terms,
                response_debug_data,
            )
            if self.debug
            else ""
        )

        if not publications:
            msg = (
                f"Ingen resultater fundet for “{query}”.\n"
                "Prøv evt. med færre ord eller et mere generelt nøgleord."
            )
            if self.debug:
                msg += debug_block
            return msg

        # 7) formatter output
        out: List[str] = []
        out.append(f"Søgning: “{query}”")
        out.append(
            "Kilde: Miljø- og Fødevareklagenævnet (https://mfkn.naevneneshus.dk)"
        )
        out.append("")
        out.append(f"Antal afgørelser/nyheder i alt: {total_count}")
        out.append(f"Antal vist i denne søgning: {len(publications)}")
        out.append("")
        out.append("Resultater:")
        out.append("───────────────────────────────")

        for pub in publications:
            pid = pub.get("id") or "ikke oplyst"
            ptype = pub.get("type") or "ruling"
            title = pub.get("title") or "ikke oplyst"
            cats = ", ".join(pub.get("categories") or []) or "ikke oplyst"
            jnr = ", ".join(pub.get("jnr") or []) or "ikke oplyst"
            date_str = pub.get("date") or "ikke oplyst"
            pub_date = pub.get("published_date") or "ikke oplyst"
            authority = pub.get("authority") or "ikke oplyst"

            clean_body = self._strip_html(pub.get("body", ""))
            ai_summary = self._make_summary(clean_body)

            link = (
                f"{self.base_url}/nyhed/{pid}"
                if ptype == "news"
                else f"{self.base_url}/afgoerelse/{pid}"
            )

            out.append(
                f"• Titel: {title}\n"
                f"• Journalnr: {jnr}\n"
                f"• Kategori(er): {cats}\n"
                f"• Dato: {date_str}\n"
                f"• Publiceret: {pub_date}\n"
                f"• Myndighed: {authority}\n"
                f"• AI-resumé: {ai_summary}\n"
                f"• Link: {link}\n"
                "───────────────────────────────"
            )

        if skip + size < total_count:
            out.append(
                f"Vil du hente de næste {self.page_size} resultater? "
                f"(skriv fx 'næste {page+1}')"
            )

        if self.debug:
            out.append(debug_block)

        return "\n".join(out)


if __name__ == "__main__":
    tool = Tools()
    print(
        tool.run(
            query="jordforurening § 72 MBL",
            page=1,
            types=["ruling"],
            lovomraader=["Miljøbeskyttelsesloven"],
        )
    )
