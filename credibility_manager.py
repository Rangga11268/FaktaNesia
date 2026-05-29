import urllib.parse
import difflib

# Massive list of trusted domains (Indonesian media, gov, institutions)
TRUSTED_DOMAINS = {
    "kompas.com", "detik.com", "antaranews.com", "cnnindonesia.com",
    "liputan6.com", "turnbackhoax.id", "tribunnews.com", "suara.com", 
    "republika.co.id", "tempo.co", "viva.co.id", "kumparan.com",
    "idntimes.com", "tirto.id", "merdeka.com", "sindonews.com",
    "okezone.com", "pikiran-rakyat.com", "bisnis.com", "jawapos.com",
    "cnbcindonesia.com", "beritasatu.com", "kapanlagi.com", "grid.id",
    "kominfo.go.id", "kemkes.go.id", "covid19.go.id", "polri.go.id",
    "tni.mil.id", "bnpb.go.id", "bmkg.go.id", "bpjs-kesehatan.go.id",
    "kemdikbud.go.id", "kemenkeu.go.id", "pajak.go.id", "kemlu.go.id",
    "setneg.go.id", "kpu.go.id", "bawaslu.go.id", "bi.go.id", "ojk.go.id",
    "idx.co.id", "bps.go.id", "pom.go.id", "mahkamahagung.go.id",
    "kemensos.go.id", "kemenag.go.id"
}

# Trusted TLDs (always trusted unless explicitly compromised, but for scoring we give them high trust)
TRUSTED_TLDS = {".go.id", ".ac.id", ".mil.id", ".desa.id"}

# Suspicious domains / platforms often abused for hoaxes/phishing
SUSPICIOUS_DOMAINS = {
    "blogspot.com", "wordpress.com", "weebly.com", "wixsite.com", 
    "tumblr.com", "medium.com", "pastebin.com", "bit.ly", "s.id", 
    "tinyurl.com", "t.co", "goo.gl", "cutt.ly", "shorturl.at",
    "linktr.ee"
}

# Highly suspicious or cheap TLDs often used by scammers
SUSPICIOUS_TLDS = {
    ".xyz", ".top", ".online", ".site", ".pw", ".tk", ".ml", ".ga", 
    ".cf", ".gq", ".vip", ".club", ".win", ".biz", ".info", ".cc"
}

def get_base_domain(domain):
    """Extracts the base domain without subdomains, simplifying for typosquatting checks."""
    parts = domain.split('.')
    if len(parts) > 2 and parts[-2] in ['co', 'go', 'ac', 'or', 'sch', 'mil', 'desa']:
        return ".".join(parts[-3:])
    elif len(parts) > 1:
        return ".".join(parts[-2:])
    return domain

def check_domain_credibility(url):
    """
    Evaluates a URL for credibility.
    Returns a dict with 'score' (-1.0 to +1.0), 'is_trusted', 'is_blacklisted', 'typosquatting_warning', 'domain'
    """
    if not url or url.strip() == "":
        return None
    
    # Add protocol if missing to parse correctly
    if not url.startswith("http"):
        url = "http://" + url
        
    try:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc.lower().replace("www.", "")
        
        if not domain:
            return None
            
        score = 0.0
        result = {
            "domain": domain,
            "is_trusted": False,
            "is_blacklisted": False,
            "typosquatting_warning": None,
            "score": score
        }
        
        # 1. Check Trusted TLDs (e.g. .go.id is highly trusted)
        for tld in TRUSTED_TLDS:
            if domain.endswith(tld):
                result["is_trusted"] = True
                result["score"] = 0.9  # Very high trust for gov/edu
                return result

        # 2. Check Explicitly Trusted Domains
        base_domain = get_base_domain(domain)
        if domain in TRUSTED_DOMAINS or base_domain in TRUSTED_DOMAINS:
            result["is_trusted"] = True
            result["score"] = 0.8
            return result
            
        # 3. Check Suspicious TLDs
        for tld in SUSPICIOUS_TLDS:
            if domain.endswith(tld):
                result["is_blacklisted"] = True
                result["score"] = -0.6
                return result
                
        # 4. Check Suspicious Domains (like blogspot, URL shorteners)
        if domain in SUSPICIOUS_DOMAINS or base_domain in SUSPICIOUS_DOMAINS:
            result["is_blacklisted"] = True
            result["score"] = -0.5
            return result
                
        # 5. Typosquatting Check
        # Compare base_domain with trusted domains using Levenshtein distance
        for trusted in TRUSTED_DOMAINS:
            # We don't want to compare completely different TLDs blindly, so compare just the names if possible
            trusted_name = trusted.split('.')[0]
            domain_name = base_domain.split('.')[0]
            
            # Require at least 4 characters to avoid false positives on short words
            if len(trusted_name) < 4 or len(domain_name) < 4:
                continue

            similarity = difflib.SequenceMatcher(None, domain_name, trusted_name).ratio()
            
            # High similarity but not exact match -> Typosquatting
            if 0.82 <= similarity < 1.0:
                result["typosquatting_warning"] = f"Domain '{domain}' mirip dengan situs terpercaya '{trusted}'. Waspada penipuan!"
                result["score"] = -0.8
                return result
                
        # Neutral unknown domain
        result["score"] = 0.0
        return result
        
    except Exception as e:
        print("Credibility check error:", e)
        return None
