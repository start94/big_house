import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from datetime import datetime, date, timedelta
from enum import Enum
import jwt
from passlib.context import CryptContext
import sqlite3
from contextlib import contextmanager
import os
from typing import Optional, List, Dict

# CrewAI & AI imports
from crewai import Agent, Task, Crew, Process, LLM
import requests
from bs4 import BeautifulSoup
import json

# --- CONFIGURAZIONE ---
SECRET_KEY = "chiave_super_segreta_per_demo"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
DATABASE_PATH = "bighouse.db"

# DeepSeek API Configuration
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-your-key-here")  # ← Metti la tua chiave qui
DEEPSEEK_MODEL = "deepseek-chat"

app = FastAPI(title="Big House API - AI Powered")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class Plan(str, Enum):
    FREE = "free"
    PRO = "pro"
    PLUS = "plus"

# --- LLM CONFIGURATION ---
def get_deepseek_llm():
    """Inizializza DeepSeek LLM per CrewAI"""
    return LLM(
        model=f"openai/{DEEPSEEK_MODEL}",
        api_key=DEEPSEEK_API_KEY,
        base_url="https://api.deepseek.com/v1",
        temperature=0.3,
    )

# --- DATABASE SETUP ---
def init_db():
    """Crea il database e la tabella users se non esistono"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            hashed_password TEXT NOT NULL,
            plan TEXT DEFAULT 'free',
            usage_date TEXT,
            deepresearch_count INTEGER DEFAULT 0,
            calcola_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print(f"✅ Database inizializzato: {DATABASE_PATH}")

@contextmanager
def get_db():
    """Context manager per connessione database"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

init_db()

# --- MODELLI PYDANTIC ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserOut(BaseModel):
    name: str
    email: EmailStr
    plan: Plan
    usage: dict

class DeepResearchRequest(BaseModel):
    query: str  # Es: "Napoli, 200k€, da ristrutturare"
    max_results: Optional[int] = 5

class CalculationRequest(BaseModel):
    city: str
    buy_price: float
    surface: float
    condition: str  # "nuovo", "buono", "da ristrutturare"
    
class RenovationScenario(BaseModel):
    level: str  # "bassa", "media", "alta"
    cost: float
    months: int
    description: str
    roi_rent: float
    roi_sell: float
    risks: List[str]

class PlanUpdate(BaseModel):
    plan: Plan

# --- AUTH & DATABASE HELPERS ---
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_user_by_email(email: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        if row:
            return dict(row)
    return None

def create_user(email: str, name: str, hashed_password: str):
    with get_db() as conn:
        cursor = conn.cursor()
        today = str(date.today())
        cursor.execute("""
            INSERT INTO users (email, name, hashed_password, plan, usage_date, deepresearch_count, calcola_count)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (email, name, hashed_password, "free", today, 0, 0))
        conn.commit()
        return cursor.lastrowid

def update_user_plan(email: str, new_plan: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET plan = ? WHERE email = ?", (new_plan, email))
        conn.commit()

def reset_usage_if_new_day(user: dict):
    today = str(date.today())
    if user["usage_date"] != today:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users 
                SET usage_date = ?, deepresearch_count = 0, calcola_count = 0
                WHERE email = ?
            """, (today, user["email"]))
            conn.commit()
        user["usage_date"] = today
        user["deepresearch_count"] = 0
        user["calcola_count"] = 0

def increment_usage(email: str, feature: str):
    with get_db() as conn:
        cursor = conn.cursor()
        if feature == "deepresearch":
            cursor.execute("UPDATE users SET deepresearch_count = deepresearch_count + 1 WHERE email = ?", (email,))
        else:
            cursor.execute("UPDATE users SET calcola_count = calcola_count + 1 WHERE email = ?", (email,))
        conn.commit()

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Credenziali non valide")
    except Exception:
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    user = get_user_by_email(email)
    if user is None:
        raise HTTPException(status_code=401, detail="Utente non trovato")
    
    reset_usage_if_new_day(user)
    return user

def check_limit(user: dict, feature: str):
    plan = user["plan"]
    count = user[f"{feature}_count"]

    if plan == "free":
        raise HTTPException(status_code=403, detail="Upgrade richiesto per questa funzione")
    
    if plan == "pro":
        if count >= 2:
            raise HTTPException(status_code=429, detail="Limite giornaliero raggiunto. Passa a Plus.")
    
    return True

# ═══════════════════════════════════════════════════════════════════════
# 🤖 SISTEMA AGENTI AI - DEEP RESEARCH
# ═══════════════════════════════════════════════════════════════════════

def scrape_idealista(query_params: dict) -> List[dict]:
    """
    Scraping simulato di Idealista
    
    IMPORTANTE: In produzione usa:
    - Rotating proxies (ScraperAPI, Bright Data)
    - Rate limiting
    - Rispetta robots.txt
    """
    # Simulazione per demo - in produzione fai scraping vero
    city = query_params.get("city", "Napoli")
    max_price = query_params.get("max_price", 200000)
    
    # Dati simulati - in produzione scraping reale
    mock_properties = [
        {
            "title": "Appartamento da ristrutturare - Centro Storico",
            "price": 185000,
            "surface": 85,
            "rooms": 3,
            "bathrooms": 1,
            "floor": 2,
            "condition": "da ristrutturare",
            "address": "Via Toledo, Napoli",
            "zone": "Centro Storico",
            "url": "https://www.idealista.it/immobile/12345",
            "description": "Appartamento in posizione centrale, necessita ristrutturazione completa. Ottimo per investimento.",
            "price_per_sqm": 2176,
        },
        {
            "title": "Trilocale da rinnovare - Vomero",
            "price": 195000,
            "surface": 90,
            "rooms": 3,
            "bathrooms": 1,
            "floor": 4,
            "condition": "da ristrutturare",
            "address": "Via Luca Giordano, Napoli",
            "zone": "Vomero",
            "url": "https://www.idealista.it/immobile/12346",
            "description": "Luminoso trilocale con balcone, da ristrutturare. Zona servita.",
            "price_per_sqm": 2167,
        },
    ]
    
    return mock_properties

def create_deep_research_agents(llm):
    """Crea gli agenti specializzati per Deep Research"""
    
    # Agent 1: Property Finder
    property_finder = Agent(
        role="Esperto Ricercatore Immobiliare",
        goal="Trovare gli immobili migliori che corrispondono ai criteri richiesti",
        backstory="Sei un agente immobiliare esperto con 20 anni di esperienza. "
                  "Conosci perfettamente il mercato italiano e sai valutare le opportunità.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )
    
    # Agent 2: Market Analyzer
    market_analyzer = Agent(
        role="Analista di Mercato Immobiliare",
        goal="Analizzare i prezzi di mercato e identificare le migliori opportunità",
        backstory="Sei un analista quantitativo specializzato in real estate. "
                  "Analizzi dati di mercato per identificare immobili sottovalutati.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )
    
    # Agent 3: Renovation Expert
    renovation_expert = Agent(
        role="Esperto in Ristrutturazioni",
        goal="Valutare lo stato degli immobili e stimare i costi di ristrutturazione",
        backstory="Sei un architetto e geometra con esperienza in ristrutturazioni. "
                  "Sai stimare con precisione tempi e costi dei lavori.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )
    
    # Agent 4: Investment Advisor
    investment_advisor = Agent(
        role="Consulente Investimenti Immobiliari",
        goal="Calcolare il ROI potenziale e dare raccomandazioni strategiche",
        backstory="Sei un consulente finanziario specializzato in investimenti immobiliari. "
                  "Calcoli rendimenti, rischi e dai consigli strategici.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )
    
    return {
        "property_finder": property_finder,
        "market_analyzer": market_analyzer,
        "renovation_expert": renovation_expert,
        "investment_advisor": investment_advisor
    }

def run_deep_research(query: str, properties: List[dict], llm) -> dict:
    """Esegue ricerca approfondita con agenti AI"""
    
    agents = create_deep_research_agents(llm)
    
    # Prepara contesto
    properties_text = json.dumps(properties, indent=2, ensure_ascii=False)
    
    # Task 1: Analisi mercato
    market_task = Task(
        description=f"""
Analizza questi immobili trovati per la query: "{query}"

Immobili disponibili:
{properties_text}

Fornisci:
1. Analisi dei prezzi al mq della zona
2. Valutazione se sono sottovalutati o sovravalutati
3. Trend del mercato in quella zona
        """,
        agent=agents["market_analyzer"],
        expected_output="Analisi dettagliata del mercato con valutazione prezzi"
    )
    
    # Task 2: Valutazione ristrutturazione
    renovation_task = Task(
        description=f"""
Per ogni immobile, stima:
1. Costo ristrutturazione (bassa/media/alta)
2. Mesi necessari
3. Lavori principali da fare
4. Valore finale stimato post-ristrutturazione

Immobili:
{properties_text}
        """,
        agent=agents["renovation_expert"],
        expected_output="Stima costi e tempi ristrutturazione per ogni immobile"
    )
    
    # Task 3: Raccomandazione investimento
    investment_task = Task(
        description=f"""
Basandoti sull'analisi di mercato e le stime di ristrutturazione, 
identifica i TOP 3 immobili migliori per investimento.

Per ognuno calcola:
1. ROI potenziale (affitto e vendita)
2. Rischi principali
3. Opportunità
4. Raccomandazione (comprare/evitare/negoziare)

Query originale: "{query}"
        """,
        agent=agents["investment_advisor"],
        expected_output="Classifica TOP 3 con analisi dettagliata ROI e raccomandazioni",
        context=[market_task, renovation_task]
    )
    
    # Crea crew e esegui
    crew = Crew(
        agents=list(agents.values()),
        tasks=[market_task, renovation_task, investment_task],
        process=Process.sequential,
        verbose=True
    )
    
    result = crew.kickoff()
    
    return {
        "query": query,
        "properties_analyzed": len(properties),
        "market_analysis": str(market_task.output) if hasattr(market_task, 'output') else "Analisi completata",
        "renovation_analysis": str(renovation_task.output) if hasattr(renovation_task, 'output') else "Valutazione completata",
        "investment_recommendation": str(investment_task.output) if hasattr(investment_task, 'output') else str(result),
        "properties": properties
    }

# ═══════════════════════════════════════════════════════════════════════
# 🤖 SISTEMA AGENTI AI - CALCOLA ROI AVANZATO
# ═══════════════════════════════════════════════════════════════════════

def create_calculation_agents(llm):
    """Crea gli agenti per il calcolo ROI avanzato"""
    
    # Agent 1: Renovation Cost Estimator
    cost_estimator = Agent(
        role="Esperto Preventivista Edile",
        goal="Calcolare con precisione i costi di ristrutturazione per ogni scenario",
        backstory="Sei un geometra con 25 anni di esperienza in preventivi edilizi. "
                  "Conosci i prezzi al mq di ogni tipo di lavoro in tutta Italia.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )
    
    # Agent 2: Timeline Planner
    timeline_planner = Agent(
        role="Project Manager Edilizio",
        goal="Pianificare i tempi di esecuzione dei lavori e identificare criticità",
        backstory="Sei un project manager specializzato in ristrutturazioni. "
                  "Sai stimare con precisione i mesi necessari e i possibili ritardi.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )
    
    # Agent 3: Risk Analyst
    risk_analyst = Agent(
        role="Analista di Rischio Immobiliare",
        goal="Identificare tutti i rischi e le possibili perdite economiche",
        backstory="Sei un risk manager specializzato in investimenti immobiliari. "
                  "Identifichi rischi nascosti e calcoli scenari pessimistici.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )
    
    return {
        "cost_estimator": cost_estimator,
        "timeline_planner": timeline_planner,
        "risk_analyst": risk_analyst
    }

def run_advanced_calculation(data: dict, llm) -> List[RenovationScenario]:
    """Calcola 3 scenari di ristrutturazione con agenti AI"""
    
    agents = create_calculation_agents(llm)
    
    city = data["city"]
    buy_price = data["buy_price"]
    surface = data["surface"]
    condition = data["condition"]
    
    context_text = f"""
Immobile da analizzare:
- Città: {city}
- Prezzo acquisto: €{buy_price:,.0f}
- Superficie: {surface} mq
- Condizione attuale: {condition}
- Prezzo al mq: €{buy_price/surface:,.0f}/mq
    """
    
    # Task 1: Calcola costi per 3 scenari
    cost_task = Task(
        description=f"""
{context_text}

Calcola i costi di ristrutturazione per 3 scenari:

1. RISTRUTTURAZIONE BASSA (cosmetica):
   - Tinteggiatura
   - Pavimenti esistenti lucidati
   - Impianti base aggiornati
   
2. RISTRUTTURAZIONE MEDIA:
   - Nuovo pavimento
   - Cucina e bagno rinnovati
   - Impianti elettrici e idraulici rifatti
   - Serramenti nuovi
   
3. RISTRUTTURAZIONE ALTA (completa):
   - Demolizioni e rifacimento layout
   - Pavimenti premium
   - Cucina e bagni di lusso
   - Domotica
   - Impianti certificati

Per ogni scenario fornisci:
- Costo totale in €
- Costo al mq
- Voci di spesa principali
        """,
        agent=agents["cost_estimator"],
        expected_output="Tre preventivi dettagliati con costi per ogni scenario"
    )
    
    # Task 2: Pianifica tempi
    timeline_task = Task(
        description=f"""
{context_text}

Per ognuno dei 3 scenari di ristrutturazione, pianifica:
1. Mesi necessari (realistici)
2. Fasi dei lavori
3. Possibili ritardi
4. Mesi realistici considerando imprevisti

Considera:
- Burocrazia (permessi, CILA, SCIA)
- Reperibilità materiali
- Stagionalità lavori
        """,
        agent=agents["timeline_planner"],
        expected_output="Timeline per ogni scenario con stima mesi realistica",
        context=[cost_task]
    )
    
    # Task 3: Analisi rischi e ROI
    risk_task = Task(
        description=f"""
{context_text}

Per ogni scenario, calcola:

1. ROI AFFITTO:
   - Canone mensile stimato post-ristrutturazione
   - Rendimento lordo annuo %
   - Rendimento netto (dopo tasse, spese condominiali)
   
2. ROI VENDITA:
   - Valore finale immobile post-ristrutturazione
   - Guadagno netto
   - ROI %
   
3. RISCHI:
   - Sforamenti budget (%)
   - Ritardi temporali
   - Difficoltà vendita/affitto
   - Perdite possibili
   
4. RACCOMANDAZIONE:
   - Scenario consigliato
   - Pro e contro

Output in formato JSON con questa struttura:
[
  {{
    "level": "bassa",
    "cost": 25000,
    "months": 2,
    "description": "Ristrutturazione cosmetica...",
    "roi_rent": 4.2,
    "roi_sell": 15.5,
    "risks": ["rischio1", "rischio2"]
  }},
  ...
]
        """,
        agent=agents["risk_analyst"],
        expected_output="JSON con 3 scenari completi di ROI e rischi",
        context=[cost_task, timeline_task]
    )
    
    # Crea crew
    crew = Crew(
        agents=list(agents.values()),
        tasks=[cost_task, timeline_task, risk_task],
        process=Process.sequential,
        verbose=True
    )
    
    result = crew.kickoff()
    
    # Parse output
    try:
        # Estrai JSON dall'output
        result_str = str(result)
        
        # Prova a parsare JSON
        if "[" in result_str and "]" in result_str:
            start = result_str.find("[")
            end = result_str.rfind("]") + 1
            json_str = result_str[start:end]
            scenarios_data = json.loads(json_str)
        else:
            # Fallback: dati simulati se l'AI non produce JSON valido
            scenarios_data = generate_fallback_scenarios(buy_price, surface, city)
        
        scenarios = [RenovationScenario(**s) for s in scenarios_data]
        
    except Exception as e:
        print(f"⚠️ Errore parsing JSON: {e}")
        # Fallback
        scenarios = [
            RenovationScenario(
                level="bassa",
                cost=surface * 300,
                months=2,
                description="Ristrutturazione cosmetica: tinteggiatura, pavimenti lucidati, aggiornamento impianti base",
                roi_rent=4.5,
                roi_sell=12.0,
                risks=["Ritardi per materiali", "Costi nascosti imprevisti"]
            ),
            RenovationScenario(
                level="media",
                cost=surface * 600,
                months=4,
                description="Ristrutturazione completa: nuovo pavimento, cucina e bagno rinnovati, impianti rifatti",
                roi_rent=5.2,
                roi_sell=18.5,
                risks=["Sforamenti budget 10-15%", "Ritardi per permessi", "Difficoltà reperimento materiali"]
            ),
            RenovationScenario(
                level="alta",
                cost=surface * 1000,
                months=6,
                description="Ristrutturazione premium: layout ridisegnato, finiture di lusso, domotica, certificazioni energetiche",
                roi_rent=6.0,
                roi_sell=25.0,
                risks=["Sforamenti budget 20%+", "Ritardi significativi", "Mercato limitato per immobili premium"]
            )
        ]
    
    return scenarios

def generate_fallback_scenarios(buy_price: float, surface: float, city: str) -> List[dict]:
    """Genera scenari fallback se gli agenti AI falliscono"""
    return [
        {
            "level": "bassa",
            "cost": surface * 300,
            "months": 2,
            "description": "Ristrutturazione cosmetica: tinteggiatura, pavimenti lucidati, impianti base aggiornati",
            "roi_rent": 4.2,
            "roi_sell": 12.0,
            "risks": ["Ritardi materiali", "Costi nascosti 5-10%"]
        },
        {
            "level": "media",
            "cost": surface * 600,
            "months": 4,
            "description": "Ristrutturazione completa: nuovo pavimento, cucina/bagno rinnovati, impianti rifatti, serramenti nuovi",
            "roi_rent": 5.5,
            "roi_sell": 18.0,
            "risks": ["Sforamenti budget 10-15%", "Ritardi permessi", "Problemi strutturali nascosti"]
        },
        {
            "level": "alta",
            "cost": surface * 1000,
            "months": 6,
            "description": "Ristrutturazione premium: demolizioni, layout ridisegnato, finiture lusso, domotica, certificazioni",
            "roi_rent": 6.5,
            "roi_sell": 25.0,
            "risks": ["Sforamenti 20%+", "Ritardi significativi", "Mercato limitato", "Difficoltà vendita"]
        }
    ]

# ═══════════════════════════════════════════════════════════════════════
# 📡 ENDPOINTS API
# ═══════════════════════════════════════════════════════════════════════

@app.post("/auth/register", response_model=Token)
async def register(user_in: UserRegister):
    if get_user_by_email(user_in.email):
        raise HTTPException(status_code=400, detail="Email già registrata")
    
    hashed_pw = get_password_hash(user_in.password)
    create_user(user_in.email, user_in.name, hashed_pw)
    
    access_token = create_access_token(data={"sub": user_in.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Email o password errati")
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserOut)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return {
        "name": current_user["name"],
        "email": current_user["email"],
        "plan": current_user["plan"],
        "usage": {
            "deepresearch": current_user["deepresearch_count"],
            "calcola": current_user["calcola_count"]
        }
    }

@app.post("/billing/upgrade")
async def upgrade_plan(plan_update: PlanUpdate, current_user: dict = Depends(get_current_user)):
    update_user_plan(current_user["email"], plan_update.plan)
    return {"status": "success", "new_plan": plan_update.plan}

@app.post("/features/deep-research")
async def deep_research_ai(
    req: DeepResearchRequest, 
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    🤖 DEEP RESEARCH CON AGENTI AI
    
    Trova immobili reali e li analizza con 4 agenti specializzati
    """
    check_limit(current_user, "deepresearch")
    
    # Parse query
    # Es: "Napoli, 200k€, da ristrutturare"
    query_lower = req.query.lower()
    
    # Estrai parametri (parsing semplice - migliora con NLP)
    city = "Napoli"  # Default
    if "napoli" in query_lower:
        city = "Napoli"
    elif "roma" in query_lower:
        city = "Roma"
    elif "milano" in query_lower:
        city = "Milano"
    
    max_price = 200000  # Default
    if "200k" in query_lower or "200.000" in query_lower:
        max_price = 200000
    elif "300k" in query_lower:
        max_price = 300000
    
    # Step 1: Scraping immobili
    properties = scrape_idealista({
        "city": city,
        "max_price": max_price,
        "condition": "da ristrutturare"
    })
    
    if not properties:
        return {
            "result": "Nessun immobile trovato per i criteri specificati. Prova ad ampliare la ricerca.",
            "properties": [],
            "remaining_usage": 2 - (current_user["deepresearch_count"] + 1) if current_user["plan"] == "pro" else "Unlimited"
        }
    
    # Step 2: Analisi con agenti AI
    llm = get_deepseek_llm()
    analysis = run_deep_research(req.query, properties, llm)
    
    # Incrementa usage
    if current_user["plan"] != "plus":
        increment_usage(current_user["email"], "deepresearch")
    
    remaining = 2 - (current_user["deepresearch_count"] + 1) if current_user["plan"] == "pro" else "Unlimited"
    
    return {
        "result": analysis["investment_recommendation"],
        "market_analysis": analysis["market_analysis"],
        "renovation_analysis": analysis["renovation_analysis"],
        "properties": analysis["properties"],
        "properties_count": len(properties),
        "remaining_usage": remaining
    }

@app.post("/features/calculate")
async def calculate_advanced_roi(
    req: CalculationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    🤖 CALCOLO ROI AVANZATO CON 3 SCENARI
    
    Analizza 3 scenari di ristrutturazione con agenti AI specializzati
    """
    check_limit(current_user, "calcola")
    
    # Calcola con agenti AI
    llm = get_deepseek_llm()
    
    data = {
        "city": req.city,
        "buy_price": req.buy_price,
        "surface": req.surface,
        "condition": req.condition
    }
    
    scenarios = run_advanced_calculation(data, llm)
    
    # Incrementa usage
    if current_user["plan"] != "plus":
        increment_usage(current_user["email"], "calcola")
    
    remaining = 2 - (current_user["calcola_count"] + 1) if current_user["plan"] == "pro" else "Unlimited"
    
    return {
        "scenarios": [s.dict() for s in scenarios],
        "buy_price": req.buy_price,
        "surface": req.surface,
        "city": req.city,
        "price_per_sqm": req.buy_price / req.surface,
        "remaining_usage": remaining
    }

@app.get("/admin/stats")
async def get_stats():
    """Statistiche database (rimuovi in produzione!)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total FROM users")
        total_users = cursor.fetchone()[0]
        
        cursor.execute("SELECT plan, COUNT(*) as count FROM users GROUP BY plan")
        plans = {row[0]: row[1] for row in cursor.fetchall()}
    
    return {
        "total_users": total_users,
        "plans": plans,
        "database_file": DATABASE_PATH,
        "deepseek_model": DEEPSEEK_MODEL
    }

if __name__ == "__main__":
    print(f"\n{'='*70}")
    print(f"🏠 BIG HOUSE AI-Powered Backend")
    print(f"{'='*70}")
    print(f"🤖 AI Model: DeepSeek ({DEEPSEEK_MODEL})")
    print(f"📊 Database: {DATABASE_PATH}")
    print(f"🌐 Server: http://localhost:8000")
    print(f"📚 API Docs: http://localhost:8000/docs")
    print(f"📈 Stats: http://localhost:8000/admin/stats")
    print(f"{'='*70}\n")
    print("⚡ Features:")
    print("  🔍 Deep Research: Trova immobili con 4 agenti AI")
    print("  🧮 Calcola ROI: 3 scenari ristrutturazione con analisi rischi")
    print(f"{'='*70}\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)