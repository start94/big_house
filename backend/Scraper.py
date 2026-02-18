"""
🔍 BIG HOUSE — Web Scraper per Idealista/Immobiliare.it

IMPORTANTE: Rispetta sempre i termini di servizio dei siti.
Usa rate limiting e considera ScraperAPI per uso commerciale.
"""

import requests
from bs4 import BeautifulSoup
import time
import random
from typing import List, Dict, Optional
import os
from urllib.parse import urlencode

class PropertyScraper:
    """Scraper per portali immobiliari italiani"""
    
    def __init__(self, use_scraper_api: bool = False):
        self.use_scraper_api = use_scraper_api
        self.scraper_api_key = os.getenv("SCRAPER_API_KEY", "")
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        }
    
    def _make_request(self, url: str, max_retries: int = 3) -> Optional[str]:
        """Fa richiesta HTTP con retry e rate limiting"""
        
        for attempt in range(max_retries):
            try:
                if self.use_scraper_api and self.scraper_api_key:
                    # Usa ScraperAPI per evitare blocchi
                    params = {
                        'api_key': self.scraper_api_key,
                        'url': url,
                        'country_code': 'it'
                    }
                    response = requests.get(
                        'http://api.scraperapi.com/',
                        params=params,
                        timeout=60
                    )
                else:
                    # Richiesta diretta
                    response = requests.get(
                        url,
                        headers=self.headers,
                        timeout=30
                    )
                
                if response.status_code == 200:
                    # Rate limiting: attendi tra richieste
                    time.sleep(random.uniform(2, 4))
                    return response.text
                
                elif response.status_code == 429:  # Too Many Requests
                    wait_time = 10 * (attempt + 1)
                    print(f"⚠️ Rate limit hit, waiting {wait_time}s...")
                    time.sleep(wait_time)
                    continue
                
                else:
                    print(f"❌ Status {response.status_code}, attempt {attempt+1}/{max_retries}")
                    time.sleep(2)
                    continue
            
            except Exception as e:
                print(f"❌ Error: {e}, attempt {attempt+1}/{max_retries}")
                time.sleep(2)
        
        return None
    
    def scrape_idealista(
        self,
        city: str,
        max_price: int,
        min_surface: int = 50,
        property_type: str = "appartamenti",
        condition: str = "da_ristrutturare"
    ) -> List[Dict]:
        """
        Scraping Idealista
        
        NOTA: Questo è un esempio educativo. Per uso commerciale:
        1. Contatta Idealista per API ufficiali
        2. Usa ScraperAPI/Bright Data
        3. Rispetta robots.txt e rate limits
        """
        
        # Normalizza nome città
        city_slug = city.lower().replace(" ", "-")
        
        # Costruisci URL Idealista
        base_url = f"https://www.idealista.it/vendita-case/{city_slug}/"
        
        params = {
            'prezzoMassimo': max_price,
            'superficieMinima': min_surface,
        }
        
        # Aggiungi filtro ristrutturazione se richiesto
        if condition == "da_ristrutturare":
            params['stato'] = 'da-ristrutturare'
        
        url = f"{base_url}?{urlencode(params)}"
        
        print(f"🔍 Scraping: {url}")
        
        html = self._make_request(url)
        
        if not html:
            print("❌ Scraping fallito")
            return self._get_mock_data(city, max_price)
        
        soup = BeautifulSoup(html, 'lxml')
        
        properties = []
        
        # Selettori CSS (potrebbero cambiare - verificare regolarmente)
        # Nota: Questi sono approssimativi, verifica sul sito reale
        articles = soup.select('article.item')
        
        for article in articles[:10]:  # Limita a 10 risultati
            try:
                # Estrai dati (adatta i selettori al sito reale)
                title_elem = article.select_one('.item-link')
                price_elem = article.select_one('.item-price')
                details_elem = article.select_one('.item-detail')
                
                if not title_elem or not price_elem:
                    continue
                
                title = title_elem.get_text(strip=True)
                
                # Parse prezzo
                price_text = price_elem.get_text(strip=True)
                price = int(''.join(filter(str.isdigit, price_text)))
                
                # Parse dettagli (superficie, locali, etc)
                details_text = details_elem.get_text(strip=True) if details_elem else ""
                
                # Cerca metri quadri
                surface = 80  # Default
                if 'm²' in details_text or 'mq' in details_text:
                    import re
                    match = re.search(r'(\d+)\s*(?:m²|mq)', details_text)
                    if match:
                        surface = int(match.group(1))
                
                # Cerca numero locali
                rooms = 3  # Default
                if 'locali' in details_text or 'vani' in details_text:
                    import re
                    match = re.search(r'(\d+)\s*(?:locali|vani)', details_text)
                    if match:
                        rooms = int(match.group(1))
                
                # URL annuncio
                link = title_elem.get('href', '')
                if link and not link.startswith('http'):
                    link = f"https://www.idealista.it{link}"
                
                property_data = {
                    "title": title,
                    "price": price,
                    "surface": surface,
                    "rooms": rooms,
                    "bathrooms": 1,  # Default
                    "floor": None,
                    "condition": condition,
                    "address": title,  # Approssimativo
                    "zone": city,
                    "url": link,
                    "description": details_text,
                    "price_per_sqm": round(price / surface) if surface else 0,
                    "source": "idealista"
                }
                
                properties.append(property_data)
            
            except Exception as e:
                print(f"⚠️ Error parsing property: {e}")
                continue
        
        if properties:
            print(f"✅ Trovati {len(properties)} immobili")
            return properties
        else:
            print("⚠️ Nessun immobile trovato, uso dati mock")
            return self._get_mock_data(city, max_price)
    
    def _get_mock_data(self, city: str, max_price: int) -> List[Dict]:
        """Dati mock per testing/fallback"""
        
        mock_properties = [
            {
                "title": f"Appartamento da ristrutturare - Centro {city}",
                "price": int(max_price * 0.85),
                "surface": 85,
                "rooms": 3,
                "bathrooms": 1,
                "floor": 2,
                "condition": "da ristrutturare",
                "address": f"Via Principale, {city}",
                "zone": f"Centro {city}",
                "url": f"https://www.idealista.it/immobile/mock-{city.lower()}-1",
                "description": "Appartamento in posizione centrale, necessita ristrutturazione completa. Ottimo per investimento.",
                "price_per_sqm": int(max_price * 0.85 / 85),
                "source": "mock"
            },
            {
                "title": f"Trilocale da rinnovare - Zona Residenziale",
                "price": int(max_price * 0.92),
                "surface": 90,
                "rooms": 3,
                "bathrooms": 1,
                "floor": 4,
                "condition": "da ristrutturare",
                "address": f"Via Secondaria, {city}",
                "zone": f"{city} Nord",
                "url": f"https://www.idealista.it/immobile/mock-{city.lower()}-2",
                "description": "Luminoso trilocale con balcone, da ristrutturare. Zona servita.",
                "price_per_sqm": int(max_price * 0.92 / 90),
                "source": "mock"
            },
            {
                "title": f"Bilocale con potenziale - Periferia",
                "price": int(max_price * 0.65),
                "surface": 60,
                "rooms": 2,
                "bathrooms": 1,
                "floor": 1,
                "condition": "da ristrutturare",
                "address": f"Via Terziaria, {city}",
                "zone": f"{city} Sud",
                "url": f"https://www.idealista.it/immobile/mock-{city.lower()}-3",
                "description": "Bilocale da ristrutturare completamente. Prezzo competitivo, ottimo per prima casa.",
                "price_per_sqm": int(max_price * 0.65 / 60),
                "source": "mock"
            }
        ]
        
        return mock_properties

# ═══════════════════════════════════════════════════════════════════════
# ESEMPIO DI USO
# ═══════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # Test scraper
    scraper = PropertyScraper(use_scraper_api=False)
    
    properties = scraper.scrape_idealista(
        city="Napoli",
        max_price=200000,
        min_surface=70,
        condition="da_ristrutturare"
    )
    
    print(f"\n📊 Trovati {len(properties)} immobili:\n")
    
    for i, prop in enumerate(properties, 1):
        print(f"{i}. {prop['title']}")
        print(f"   💰 Prezzo: €{prop['price']:,} ({prop['price_per_sqm']}€/mq)")
        print(f"   📏 Superficie: {prop['surface']}mq, {prop['rooms']} locali")
        print(f"   🔗 {prop['url']}")
        print()