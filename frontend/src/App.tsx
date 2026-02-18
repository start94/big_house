import React from 'react';
import { useState, useEffect } from "react";

type View = "landing" | "auth" | "pricing" | "dashboard";
type AuthMode = "login" | "register";
type Plan = "free" | "pro" | "plus";
type Lang = "it" | "en" | "fr" | "de" | "es" | "pt";
type SidebarItem = "ricerca" | "deepresearch" | "calcola";
type RenovationLevel = "basso" | "medio" | "alto";

// ════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ════════════════════════════════════════════════════════════════════
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
const GOOGLE_AUTH_URL = `${API_BASE}/auth/google`;

interface User {
  name: string;
  email: string;
  plan: Plan;
  usage: { deepresearch: number; calcola: number };
}

// ════════════════════════════════════════════════════════════════════
// TRANSLATIONS (Mantenute uguali per brevità, focus sulla logica)
// ════════════════════════════════════════════════════════════════════
const T: Record<Lang, Record<string, string>> = {
  it: {
    tagline:"Il mercato immobiliare, analizzato dall'intelligenza artificiale.",heroBadge:"AI · Real Estate · Market Intelligence",
    login:"Accedi",register:"Registrati",or:"oppure",continueGoogle:"Continua con Google",
    email:"Email",password:"Password",name:"Nome completo",namePh:"Mario Rossi",emailPh:"email@esempio.com",passPh:"••••••••",
    haveAccount:"Hai già un account?",noAccount:"Non hai un account?",
    choosePlan:"Scegli il tuo piano",planSub:"Potenzia le tue ricerche immobiliari con l'AI",
    monthly:"Mensile",yearly:"Annuale",saveYearly:"Risparmia 20%",
    freePlan:"Free",proPlan:"Pro",plusPlan:"Plus",
    freeDesc:"Per iniziare ad esplorare",proDesc:"Per professionisti",plusDesc:"Per chi vuole tutto",
    continueWith:"Continua con",startFree:"Inizia gratis",perMonth:"/ mese",perYear:"/ anno",
    popular:"🔥 POPOLARE",addCard:"Inserisci i dati della carta",cardSub:"Piano",
    cardNum:"Numero carta",expiry:"Scadenza",cvv:"CVV",cardNumPh:"1234 5678 9012 3456",expiryPh:"MM/AA",
    activate:"Attiva abbonamento",skipCard:"Continua in modalità Free",
    ff1:"Ricerca base illimitata",ff2:"Dati di mercato generali",ff3:"1 report al mese",
    fnd:"Deep Research",fnc:"Calcola",
    fp1:"Tutto il piano Free",fp2:"Deep Research (2/giorno)",fp3:"Calcola (2/giorno)",fp4:"Report illimitati",fp5:"Export Excel & Word",
    fpl1:"Tutto il piano Pro",fpl2:"Deep Research illimitato",fpl3:"Calcola illimitato",fpl4:"Accesso API",fpl5:"Supporto prioritario",
    ricerca:"Ricerca",deepresearch:"Deep Research",calcola:"Calcola",
    allPlans:"Tutti i piani",proFeat:"2 al giorno · Pro | Illimitato · Plus",
    settings:"Impostazioni",welcome:"Benvenuto",activePlan:"Piano attivo",
    upgToPro:"↑ Upgrade a Pro",upgToPlus:"↑ Upgrade a Plus",
    searchPh:"Cerca nel mercato immobiliare...",
    dashTitle:"Cosa vuoi analizzare oggi?",dashSub:"BIG HOUSE analizza il mercato immobiliare in tempo reale con intelligenza artificiale.",
    analyze:"Analizza →",
    sug1:"Milano residenziale",sug2:"Roma prezzi €/mq",sug3:"Affitti brevi Napoli",sug4:"Mutui 2025",
    deepTitle:"Analisi approfondita multi-sorgente con DeepSeek AI.",deepUsage:"Utilizzi rimanenti oggi:",deepUnlimited:"Ricerche illimitate.",
    deepPh:"Es: 'Cercami una casa da ristrutturare a Parigi centro, 110mq, ROI 22%'",
    startDeep:"🚀 Avvia Deep Research",
    calcSub:"Calcola rendimenti reali, costi ristrutturazione e ROI.",calcUnlimited:"Calcoli illimitati.",calcUsage:"Utilizzi rimanenti oggi:",
    buyPrice:"Prezzo acquisto (€)",rentMonth:"Canone affitto mensile (€)",surface:"Superficie (mq)",city:"Città",
    buyPh:"250000",rentPh:"1200",surfPh:"80",cityPh:"Milano",calcBtn:"🧮 Calcola ROI Reale",
    grossYield:"Rendimento Lordo",netYield:"Rendimento Netto",pricePerSqm:"€/mq",
    perYear2:"annuo",afterTax:"dopo tasse",buyLbl:"prezzo acquisto",
    upgradeTitle:"Funzione riservata",upgradeMsg:"Questa funzione richiede un piano Pro o superiore.",upgradeCta:"Passa a Pro",
    limitTitle:"Limite giornaliero raggiunto",limitMsg:"Hai raggiunto il limite giornaliero. Passa a Plus per ricerche illimitate.",upgPlus:"→ Plus",
    cancel:"Annulla",close:"Chiudi",logout:"Esci",proOnly:"Solo Pro e Plus",
    error:"Errore",loading:"Caricamento...",authError:"Email o password errati",
    renovLvl: "Livello Ristrutturazione", low:"Basso (Economico)", med:"Medio (Standard)", high:"Alto (Lusso)"
  },
  en: {
    tagline:"The real estate market, analyzed by artificial intelligence.",heroBadge:"AI · Real Estate · Market Intelligence",
    login:"Sign In",register:"Sign Up",or:"or",continueGoogle:"Continue with Google",
    email:"Email",password:"Password",name:"Full Name",namePh:"John Smith",emailPh:"email@example.com",passPh:"••••••••",
    haveAccount:"Already have an account?",noAccount:"Don't have an account?",
    choosePlan:"Choose your plan",planSub:"Power your real estate research with AI",
    monthly:"Monthly",yearly:"Yearly",saveYearly:"Save 20%",
    freePlan:"Free",proPlan:"Pro",plusPlan:"Plus",
    freeDesc:"Start exploring",proDesc:"For professionals",plusDesc:"For power users",
    continueWith:"Continue with",startFree:"Start for free",perMonth:"/ month",perYear:"/ year",
    popular:"🔥 POPULAR",addCard:"Enter your card details",cardSub:"Plan",
    cardNum:"Card number",expiry:"Expiry",cvv:"CVV",cardNumPh:"1234 5678 9012 3456",expiryPh:"MM/YY",
    activate:"Activate subscription",skipCard:"Continue with Free plan",
    ff1:"Unlimited basic search",ff2:"General market data",ff3:"1 report per month",
    fnd:"Deep Research",fnc:"Calculate",
    fp1:"Everything in Free",fp2:"Deep Research (2/day)",fp3:"Calculate (2/day)",fp4:"Unlimited reports",fp5:"Excel & Word export",
    fpl1:"Everything in Pro",fpl2:"Unlimited Deep Research",fpl3:"Unlimited calculations",fpl4:"API access",fpl5:"Priority support",
    ricerca:"Search",deepresearch:"Deep Research",calcola:"Calculate",
    allPlans:"All plans",proFeat:"2/day · Pro | Unlimited · Plus",
    settings:"Settings",welcome:"Welcome",activePlan:"Active plan",
    upgToPro:"↑ Upgrade to Pro",upgToPlus:"↑ Upgrade to Plus",
    searchPh:"Search the real estate market...",
    dashTitle:"What would you like to analyze today?",dashSub:"BIG HOUSE analyzes the real estate market in real time with artificial intelligence.",
    analyze:"Analyze →",
    sug1:"Milan residential",sug2:"Rome prices €/sqm",sug3:"Short rentals Naples",sug4:"Mortgages 2025",
    deepTitle:"In-depth multi-source analysis with DeepSeek AI.",deepUsage:"Remaining today:",deepUnlimited:"Unlimited searches.",
    deepPh:"Ex: 'Find a house to renovate in Paris center, 110sqm, 22% ROI'",
    startDeep:"🚀 Start Deep Research",
    calcSub:"Calculate real returns, renovation costs and ROI.",calcUnlimited:"Unlimited calculations.",calcUsage:"Remaining today:",
    buyPrice:"Purchase price (€)",rentMonth:"Monthly rent (€)",surface:"Surface (sqm)",city:"City",
    buyPh:"250000",rentPh:"1200",surfPh:"80",cityPh:"London",calcBtn:"🧮 Calculate Real ROI",
    grossYield:"Gross Yield",netYield:"Net Yield",pricePerSqm:"€/sqm",
    perYear2:"per year",afterTax:"after tax",buyLbl:"purchase price",
    upgradeTitle:"Feature locked",upgradeMsg:"This feature requires a Pro plan or higher.",upgradeCta:"Upgrade to Pro",
    limitTitle:"Daily limit reached",limitMsg:"You've reached the daily limit. Upgrade to Plus for unlimited access.",upgPlus:"→ Plus",
    cancel:"Cancel",close:"Close",logout:"Sign out",proOnly:"Pro & Plus only",
    error:"Error",loading:"Loading...",authError:"Invalid email or password",
    renovLvl: "Renovation Level", low:"Low (Budget)", med:"Medium (Standard)", high:"High (Luxury)"
  },
  fr: { tagline:"Le marché immobilier analysé par l'IA.", heroBadge:"AI · Immobilier · Intelligence", login:"Connexion", register:"S'inscrire", or:"ou", continueGoogle:"Continuer avec Google", email:"Email", password:"Mot de passe", name:"Nom complet", namePh:"Jean Dupont", emailPh:"email@exemple.com", passPh:"••••••••", haveAccount:"Déjà un compte ?", noAccount:"Pas de compte ?", choosePlan:"Choisir un plan", planSub:"Boostez vos recherches avec l'IA", monthly:"Mensuel", yearly:"Annuel", saveYearly:"-20%", freePlan:"Gratuit", proPlan:"Pro", plusPlan:"Plus", freeDesc:"Pour commencer", proDesc:"Pour les pros", plusDesc:"Pour les experts", continueWith:"Continuer avec", startFree:"Commencer gratuitement", perMonth:"/ mois", perYear:"/ an", popular:"🔥 POPULAIRE", addCard:"Détails de la carte", cardSub:"Plan", cardNum:"Numéro de carte", expiry:"Expiration", cvv:"CVV", cardNumPh:"1234...", expiryPh:"MM/AA", activate:"Activer", skipCard:"Continuer en gratuit", ff1:"Recherche illimitée", ff2:"Données marché", ff3:"1 rapport/mois", fnd:"Deep Research", fnc:"Calculer", fp1:"Tout du plan Gratuit", fp2:"Deep Research (2/jour)", fp3:"Calculer (2/jour)", fp4:"Rapports illimités", fp5:"Export Excel", fpl1:"Tout du plan Pro", fpl2:"Deep Research illimité", fpl3:"Calculs illimités", fpl4:"API", fpl5:"Support prioritaire", ricerca:"Recherche", deepresearch:"Deep Research", calcola:"Calculer", allPlans:"Tous les plans", proFeat:"2/jour · Pro | Illimité · Plus", settings:"Paramètres", welcome:"Bienvenue", activePlan:"Plan actif", upgToPro:"↑ Passer à Pro", upgToPlus:"↑ Passer à Plus", searchPh:"Rechercher...", dashTitle:"Que voulez-vous analyser ?", dashSub:"Analyse en temps réel par IA.", analyze:"Analyser →", sug1:"Paris résidentiel", sug2:"Lyon prix m²", sug3:"Location Nice", sug4:"Taux 2025", deepTitle:"Analyse approfondie IA.", deepUsage:"Restant aujourd'hui :", deepUnlimited:"Illimité.", deepPh:"Ex: 'Maison à rénover Paris centre, 110m2, ROI 22%'", startDeep:"🚀 Lancer", calcSub:"Calcul ROI réel et rénovation.", calcUnlimited:"Illimité.", calcUsage:"Restant :", buyPrice:"Prix achat (€)", rentMonth:"Loyer mensuel (€)", surface:"Surface (m²)", city:"Ville", buyPh:"250000", rentPh:"1200", surfPh:"80", cityPh:"Paris", calcBtn:"🧮 Calculer ROI", grossYield:"Rendement Brut", netYield:"Rendement Net", pricePerSqm:"€/m²", perYear2:"par an", afterTax:"net d'impôt", buyLbl:"prix achat", upgradeTitle:"Fonction bloquée", upgradeMsg:"Nécessite un plan Pro.", upgradeCta:"Passer à Pro", limitTitle:"Limite atteinte", limitMsg:"Passez à Plus pour l'illimité.", upgPlus:"→ Plus", cancel:"Annuler", close:"Fermer", logout:"Déconnexion", proOnly:"Pro & Plus", error:"Erreur", loading:"Chargement...", authError:"Erreur d'authentification", renovLvl: "Niveau Rénovation", low:"Bas", med:"Moyen", high:"Haut" },
  de: { tagline:"Der Immobilienmarkt, analysiert von KI.", heroBadge:"AI · Immobilien · Intelligence", login:"Anmelden", register:"Registrieren", or:"oder", continueGoogle:"Weiter mit Google", email:"E-Mail", password:"Passwort", name:"Name", namePh:"Max Mustermann", emailPh:"email@beispiel.de", passPh:"••••••••", haveAccount:"Bereits registriert?", noAccount:"Kein Konto?", choosePlan:"Plan wählen", planSub:"Immobilienanalyse mit KI", monthly:"Monatlich", yearly:"Jährlich", saveYearly:"Spare 20%", freePlan:"Free", proPlan:"Pro", plusPlan:"Plus", freeDesc:"Zum Starten", proDesc:"Für Profis", plusDesc:"Für Experten", continueWith:"Weiter mit", startFree:"Kostenlos starten", perMonth:"/ Monat", perYear:"/ Jahr", popular:"🔥 BELIEBT", addCard:"Kartendaten", cardSub:"Plan", cardNum:"Kartennummer", expiry:"Gültig bis", cvv:"CVV", cardNumPh:"1234...", expiryPh:"MM/JJ", activate:"Aktivieren", skipCard:"Kostenlos weiter", ff1:"Unbegrenzte Suche", ff2:"Marktdaten", ff3:"1 Bericht/Monat", fnd:"Deep Research", fnc:"Rechner", fp1:"Alles in Free", fp2:"Deep Research (2/Tag)", fp3:"Rechner (2/Tag)", fp4:"Unbegrenzte Berichte", fp5:"Excel Export", fpl1:"Alles in Pro", fpl2:"Deep Research unbegrenzt", fpl3:"Rechner unbegrenzt", fpl4:"API Zugang", fpl5:"Prio Support", ricerca:"Suche", deepresearch:"Deep Research", calcola:"Rechner", allPlans:"Alle Pläne", proFeat:"2/Tag · Pro | Unbegrenzt · Plus", settings:"Einstellungen", welcome:"Willkommen", activePlan:"Aktiver Plan", upgToPro:"↑ Upgrade auf Pro", upgToPlus:"↑ Upgrade auf Plus", searchPh:"Suche...", dashTitle:"Was möchten Sie analysieren?", dashSub:"Echtzeit-Analyse mit KI.", analyze:"Analysieren →", sug1:"Berlin Wohnungen", sug2:"München Preise", sug3:"Hamburg Miete", sug4:"Zinsen 2025", deepTitle:"Tiefenanalyse mit KI.", deepUsage:"Verbleibend:", deepUnlimited:"Unbegrenzt.", deepPh:"Bsp: 'Haus renovieren Paris Zentrum, 110qm, ROI 22%'", startDeep:"🚀 Starten", calcSub:"ROI und Renovierung berechnen.", calcUnlimited:"Unbegrenzt.", calcUsage:"Verbleibend:", buyPrice:"Kaufpreis (€)", rentMonth:"Miete monatlich (€)", surface:"Fläche (m²)", city:"Stadt", buyPh:"250000", rentPh:"1200", surfPh:"80", cityPh:"Berlin", calcBtn:"🧮 ROI berechnen", grossYield:"Bruttorendite", netYield:"Nettorendite", pricePerSqm:"€/m²", perYear2:"pro Jahr", afterTax:"nach Steuern", buyLbl:"Kaufpreis", upgradeTitle:"Funktion gesperrt", upgradeMsg:"Benötigt Pro Plan.", upgradeCta:"Upgrade auf Pro", limitTitle:"Limit erreicht", limitMsg:"Upgrade auf Plus für unbegrenzten Zugang.", upgPlus:"→ Plus", cancel:"Abbrechen", close:"Schließen", logout:"Abmelden", proOnly:"Nur Pro & Plus", error:"Fehler", loading:"Laden...", authError:"Anmeldefehler", renovLvl: "Renovierungsgrad", low:"Niedrig", med:"Mittel", high:"Hoch" },
  es: { tagline:"El mercado inmobiliario analizado por IA.", heroBadge:"IA · Inmobiliaria · Inteligencia", login:"Entrar", register:"Registrarse", or:"o", continueGoogle:"Continuar con Google", email:"Email", password:"Contraseña", name:"Nombre", namePh:"Juan Pérez", emailPh:"email@ejemplo.com", passPh:"••••••••", haveAccount:"¿Ya tienes cuenta?", noAccount:"¿No tienes cuenta?", choosePlan:"Elige tu plan", planSub:"Potencia tu búsqueda con IA", monthly:"Mensual", yearly:"Anual", saveYearly:"Ahorra 20%", freePlan:"Gratis", proPlan:"Pro", plusPlan:"Plus", freeDesc:"Para empezar", proDesc:"Para profesionales", plusDesc:"Para expertos", continueWith:"Continuar con", startFree:"Empezar gratis", perMonth:"/ mes", perYear:"/ año", popular:"🔥 POPULAR", addCard:"Datos de tarjeta", cardSub:"Plan", cardNum:"Número tarjeta", expiry:"Vencimiento", cvv:"CVV", cardNumPh:"1234...", expiryPh:"MM/AA", activate:"Activar", skipCard:"Continuar gratis", ff1:"Búsqueda ilimitada", ff2:"Datos de mercado", ff3:"1 informe/mes", fnd:"Deep Research", fnc:"Calcular", fp1:"Todo en Gratis", fp2:"Deep Research (2/día)", fp3:"Calcular (2/día)", fp4:"Informes ilimitados", fp5:"Exportar Excel", fpl1:"Todo en Pro", fpl2:"Deep Research ilimitado", fpl3:"Cálculos ilimitados", fpl4:"Acceso API", fpl5:"Soporte prioritario", ricerca:"Buscar", deepresearch:"Deep Research", calcola:"Calcular", allPlans:"Todos los planes", proFeat:"2/día · Pro | Ilimitado · Plus", settings:"Ajustes", welcome:"Bienvenido", activePlan:"Plan activo", upgToPro:"↑ Mejorar a Pro", upgToPlus:"↑ Mejorar a Plus", searchPh:"Buscar...", dashTitle:"¿Qué quieres analizar?", dashSub:"Análisis en tiempo real con IA.", analyze:"Analizar →", sug1:"Madrid residencial", sug2:"Barcelona precios", sug3:"Alquiler Valencia", sug4:"Hipotecas 2025", deepTitle:"Análisis profundo con IA.", deepUsage:"Restante hoy:", deepUnlimited:"Ilimitado.", deepPh:"Ej: 'Casa para reformar París centro, 110m2, ROI 22%'", startDeep:"🚀 Iniciar", calcSub:"Calcular ROI real y reformas.", calcUnlimited:"Ilimitado.", calcUsage:"Restante:", buyPrice:"Precio compra (€)", rentMonth:"Alquiler mensual (€)", surface:"Superficie (m²)", city:"Ciudad", buyPh:"250000", rentPh:"1200", surfPh:"80", cityPh:"Madrid", calcBtn:"🧮 Calcular ROI", grossYield:"Rentabilidad Bruta", netYield:"Rentabilidad Neta", pricePerSqm:"€/m²", perYear2:"anual", afterTax:"neto", buyLbl:"precio compra", upgradeTitle:"Función bloqueada", upgradeMsg:"Requiere plan Pro.", upgradeCta:"Mejorar a Pro", limitTitle:"Límite alcanzado", limitMsg:"Pasa a Plus para acceso ilimitado.", upgPlus:"→ Plus", cancel:"Cancelar", close:"Cerrar", logout:"Salir", proOnly:"Solo Pro y Plus", error:"Error", loading:"Cargando...", authError:"Error de autenticación", renovLvl: "Nivel Reforma", low:"Bajo", med:"Medio", high:"Alto" },
  pt: { tagline:"O mercado imobiliário analisado por IA.", heroBadge:"IA · Imobiliário · Inteligência", login:"Entrar", register:"Registar", or:"ou", continueGoogle:"Continuar com Google", email:"Email", password:"Senha", name:"Nome", namePh:"João Silva", emailPh:"email@exemplo.com", passPh:"••••••••", haveAccount:"Já tem conta?", noAccount:"Não tem conta?", choosePlan:"Escolha o plano", planSub:"Potencie a sua pesquisa com IA", monthly:"Mensal", yearly:"Anual", saveYearly:"Poupe 20%", freePlan:"Grátis", proPlan:"Pro", plusPlan:"Plus", freeDesc:"Para começar", proDesc:"Para profissionais", plusDesc:"Para especialistas", continueWith:"Continuar com", startFree:"Começar grátis", perMonth:"/ mês", perYear:"/ ano", popular:"🔥 POPULAR", addCard:"Dados do cartão", cardSub:"Plano", cardNum:"Número cartão", expiry:"Validade", cvv:"CVV", cardNumPh:"1234...", expiryPh:"MM/AA", activate:"Ativar", skipCard:"Continuar grátis", ff1:"Pesquisa ilimitada", ff2:"Dados de mercado", ff3:"1 relatório/mês", fnd:"Deep Research", fnc:"Calcular", fp1:"Tudo no Grátis", fp2:"Deep Research (2/dia)", fp3:"Calcular (2/dia)", fp4:"Relatórios ilimitados", fp5:"Exportar Excel", fpl1:"Tudo no Pro", fpl2:"Deep Research ilimitado", fpl3:"Cálculos ilimitados", fpl4:"Acesso API", fpl5:"Suporte prioritário", ricerca:"Pesquisar", deepresearch:"Deep Research", calcola:"Calcular", allPlans:"Todos os planos", proFeat:"2/dia · Pro | Ilimitado · Plus", settings:"Definições", welcome:"Bem-vindo", activePlan:"Plano ativo", upgToPro:"↑ Upgrade para Pro", upgToPlus:"↑ Upgrade para Plus", searchPh:"Pesquisar...", dashTitle:"O que quer analisar?", dashSub:"Análise em tempo real com IA.", analyze:"Analisar →", sug1:"Lisboa residencial", sug2:"Porto preços", sug3:"Arrendamento Algarve", sug4:"Crédito 2025", deepTitle:"Análise profunda com IA.", deepUsage:"Restante hoje:", deepUnlimited:"Ilimitado.", deepPh:"Ex: 'Casa para remodelar Paris centro, 110m2, ROI 22%'", startDeep:"🚀 Iniciar", calcSub:"Calcular ROI real e obras.", calcUnlimited:"Ilimitado.", calcUsage:"Restante:", buyPrice:"Preço compra (€)", rentMonth:"Renda mensal (€)", surface:"Área (m²)", city:"Cidade", buyPh:"250000", rentPh:"1200", surfPh:"80", cityPh:"Lisboa", calcBtn:"🧮 Calcular ROI", grossYield:"Rentabilidade Bruta", netYield:"Rentabilidade Líquida", pricePerSqm:"€/m²", perYear2:"anual", afterTax:"líquido", buyLbl:"preço compra", upgradeTitle:"Função bloqueada", upgradeMsg:"Requer plano Pro.", upgradeCta:"Mudar para Pro", limitTitle:"Limite atingido", limitMsg:"Mude para Plus para acesso ilimitado.", upgPlus:"→ Plus", cancel:"Cancelar", close:"Fechar", logout:"Sair", proOnly:"Só Pro e Plus", error:"Erro", loading:"A carregar...", authError:"Erro de autenticação", renovLvl: "Nível Remodelação", low:"Baixo", med:"Médio", high:"Alto" },
};

const FLAGS: Record<Lang,string> = {it:"🇮🇹",en:"🇬🇧",fr:"🇫🇷",de:"🇩🇪",es:"🇪🇸",pt:"🇵🇹"};
const LABELS: Record<Lang,string> = {it:"Italiano",en:"English",fr:"Français",de:"Deutsch",es:"Español",pt:"Português"};
const LOCALES: Record<Lang,string> = {it:"it-IT",en:"en-GB",fr:"fr-FR",de:"de-DE",es:"es-ES",pt:"pt-PT"};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif}
.bh{min-height:100vh;background:#f8faff}
.land{min-height:100vh;background:linear-gradient(135deg,#f0f5ff,#fff 50%,#e8f0fe);position:relative;overflow:hidden}
.land::before,.land::after{content:'';position:absolute;border-radius:50%;pointer-events:none}
.land::before{top:-200px;right:-200px;width:600px;height:600px;background:radial-gradient(circle,rgba(37,99,235,.08),transparent 70%)}
.land::after{bottom:-150px;left:-150px;width:500px;height:500px;background:radial-gradient(circle,rgba(26,58,110,.06),transparent 70%)}
.nav{display:flex;align-items:center;justify-content:space-between;padding:20px 40px;background:rgba(255,255,255,.8);backdrop-filter:blur(12px);border-bottom:1px solid rgba(37,99,235,.08);position:sticky;top:0;z-index:100}
.logo{font-family:'Playfair Display',serif;font-size:22px;color:#1a3a6e;font-weight:900;letter-spacing:2px}
.nav-r{display:flex;align-items:center;gap:12px}
.lang-wrap{position:relative}
.lang-btn{display:flex;align-items:center;gap:6px;background:transparent;border:1.5px solid #cbd5e1;border-radius:8px;padding:6px 12px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;color:#334155;transition:all .2s}
.lang-btn:hover{border-color:#2563eb;color:#2563eb}
.lang-drop{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);min-width:160px;overflow:hidden;z-index:200}
.lang-opt{display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;font-size:14px;color:#334155;transition:background .15s}
.lang-opt:hover{background:#f0f5ff}.lang-opt.on{background:#eff6ff;color:#2563eb;font-weight:600}
.usr-btn{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid #cbd5e1;border-radius:8px;padding:6px 14px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;color:#334155;transition:all .2s}
.usr-btn:hover{border-color:#2563eb;color:#2563eb}
.usr-ico{width:28px;height:28px;border-radius:50%;background:#e8f0fe;display:flex;align-items:center;justify-content:center;color:#2563eb;font-size:15px}
.usr-drop{position:absolute;top:calc(100% + 8px);left:0;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.12);min-width:180px;overflow:hidden;z-index:200}
.usr-item{display:flex;align-items:center;gap:10px;padding:11px 16px;cursor:pointer;font-size:14px;color:#334155;transition:background .15s;border-bottom:1px solid #f1f5f9}
.usr-item:last-child{border-bottom:none}.usr-item:hover{background:#f0f5ff}
.hero{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 80px);padding:60px 20px;text-align:center}
.badge{display:inline-flex;align-items:center;gap:6px;background:#eff6ff;color:#2563eb;border:1px solid #bfdbfe;border-radius:999px;padding:6px 16px;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:28px}
.h-title{font-family:'Playfair Display',serif;font-size:clamp(56px,10vw,96px);font-weight:900;color:#1a3a6e;letter-spacing:4px;line-height:1;margin-bottom:20px}
.h-title span{color:#2563eb}
.h-sub{font-size:17px;color:#64748b;max-width:520px;line-height:1.7;margin-bottom:48px;font-weight:300}
.h-acts{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}
.btn-p{background:linear-gradient(135deg,#1a3a6e,#2563eb);color:#fff;border:none;border-radius:12px;padding:14px 32px;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .25s;box-shadow:0 4px 16px rgba(37,99,235,.3)}
.btn-p:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,99,235,.4)}
.btn-p:disabled{opacity:.5;cursor:not-allowed;transform:none}
.btn-o{background:transparent;color:#1a3a6e;border:2px solid #1a3a6e;border-radius:12px;padding:13px 32px;font-size:15px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .25s}
.btn-o:hover{background:#1a3a6e;color:#fff;transform:translateY(-2px)}
.auth-pg{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#f0f5ff,#fff 60%,#e8f0fe);padding:20px}
.auth-card{background:#fff;border-radius:24px;padding:48px 44px;box-shadow:0 20px 60px rgba(26,58,110,.12);width:100%;max-width:420px;border:1px solid #e8effe}
.auth-logo{font-family:'Playfair Display',serif;font-size:28px;color:#1a3a6e;font-weight:900;letter-spacing:3px;text-align:center;margin-bottom:8px}
.auth-sub{text-align:center;color:#64748b;font-size:14px;margin-bottom:32px}
.tabs{display:flex;background:#f1f5f9;border-radius:10px;padding:4px;margin-bottom:28px}
.tab{flex:1;padding:9px;border:none;background:transparent;border-radius:7px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;color:#64748b;transition:all .2s}
.tab.on{background:#fff;color:#1a3a6e;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.fg{margin-bottom:16px}
.fl{display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:6px}
.fi{width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;color:#1e293b;transition:border-color .2s;outline:none;background:#fafbfe}
.fi:focus{border-color:#2563eb;background:#fff}
.abtn{width:100%;padding:13px;background:linear-gradient(135deg,#1a3a6e,#2563eb);color:#fff;border:none;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;margin-top:8px;transition:all .25s;box-shadow:0 4px 14px rgba(37,99,235,.25)}
.abtn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(37,99,235,.35)}
.abtn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.divider{display:flex;align-items:center;gap:12px;margin:20px 0}
.divider::before,.divider::after{content:'';flex:1;height:1px;background:#e2e8f0}
.divider span{font-size:12px;color:#94a3b8;font-weight:500}
.gbtn{width:100%;padding:12px;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:#334155;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .2s}
.gbtn:hover{border-color:#2563eb;background:#f8faff}
.sw{text-align:center;margin-top:20px;font-size:13px;color:#64748b}
.sw button{background:none;border:none;color:#2563eb;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px}
.err{background:#fee;border:1px solid #fcc;color:#c00;padding:12px;border-radius:8px;font-size:13px;margin-bottom:16px;text-align:center}
.price-pg{min-height:100vh;padding:60px 20px;background:linear-gradient(135deg,#f0f5ff,#fff 50%,#e8f0fe)}
.ph{text-align:center;margin-bottom:48px}
.pt{font-family:'Playfair Display',serif;font-size:40px;color:#1a3a6e;font-weight:900;margin-bottom:10px}
.ps{color:#64748b;font-size:16px}
.btog{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:48px}
.tl{font-size:14px;font-weight:500;color:#64748b}
.tl.on{color:#1a3a6e;font-weight:600}
.tog{width:48px;height:26px;background:#e2e8f0;border-radius:999px;border:none;cursor:pointer;position:relative;transition:background .25s}
.tog.on{background:#2563eb}
.tog::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .25s;box-shadow:0 2px 4px rgba(0,0,0,.15)}
.tog.on::after{transform:translateX(22px)}
.sbadge{background:#dcfce7;color:#16a34a;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700}
.plans{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;max-width:960px;margin:0 auto}
.plan{background:#fff;border-radius:20px;padding:36px 32px;border:2px solid #e8effe;flex:1;min-width:260px;max-width:300px;transition:all .25s;position:relative;cursor:pointer}
.plan:hover{transform:translateY(-4px);box-shadow:0 16px 40px rgba(26,58,110,.12)}
.plan.ft{background:linear-gradient(145deg,#1a3a6e,#2563eb);border-color:transparent;transform:translateY(-8px);box-shadow:0 20px 50px rgba(37,99,235,.35);color:#fff}
.plan.ft:hover{transform:translateY(-12px)}
.pbadge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#fbbf24;color:#fff;border-radius:999px;padding:4px 14px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(251,191,36,.4)}
.pname{font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#64748b;margin-bottom:8px}
.plan.ft .pname{color:rgba(255,255,255,.7)}
.pprice{font-family:'Playfair Display',serif;font-size:48px;font-weight:900;color:#1a3a6e;line-height:1;margin-bottom:4px}
.plan.ft .pprice{color:#fff}
.pper{font-size:13px;color:#94a3b8;margin-bottom:6px}
.plan.ft .pper{color:rgba(255,255,255,.6)}
.pdesc{font-size:13px;color:#64748b;margin-bottom:24px}
.plan.ft .pdesc{color:rgba(255,255,255,.75)}
.pfeats{list-style:none;margin-bottom:28px}
.pfeats li{font-size:13px;color:#475569;padding:5px 0;display:flex;align-items:center;gap:8px}
.plan.ft .pfeats li{color:rgba(255,255,255,.85)}
.ficon{color:#2563eb;font-weight:700}
.plan.ft .ficon{color:#93c5fd}
.pcta{width:100%;padding:12px;border-radius:10px;border:none;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all .2s}
.pcta.ol{background:transparent;border:2px solid #2563eb;color:#2563eb}
.pcta.ol:hover{background:#2563eb;color:#fff}
.pcta.wh{background:#fff;color:#1a3a6e;box-shadow:0 4px 12px rgba(0,0,0,.1)}
.pcta.wh:hover{background:#f0f5ff}
.cov{position:fixed;inset:0;background:rgba(26,58,110,.5);display:flex;align-items:center;justify-content:center;z-index:500;padding:20px;backdrop-filter:blur(4px)}
.cmod{background:#fff;border-radius:24px;padding:44px 40px;max-width:420px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.2)}
.ctit{font-family:'Playfair Display',serif;font-size:26px;color:#1a3a6e;font-weight:900;margin-bottom:6px}
.csub{font-size:13px;color:#64748b;margin-bottom:28px}
.crow{display:flex;gap:12px}
.crow .fg{flex:1}
.cacts{display:flex;flex-direction:column;gap:10px;margin-top:20px}
.skip{background:none;border:none;color:#94a3b8;font-size:13px;cursor:pointer;font-family:'DM Sans',sans-serif;text-decoration:underline}
.dash{display:flex;min-height:100vh;background:#f8faff}
.sb{width:260px;background:#fff;border-right:1px solid #e8effe;display:flex;flex-direction:column;padding:24px 0;box-shadow:2px 0 16px rgba(26,58,110,.04);position:sticky;top:0;height:100vh}
.sb-logo{font-family:'Playfair Display',serif;font-size:20px;color:#1a3a6e;font-weight:900;letter-spacing:3px;padding:0 24px 28px}
.sb-logo span{color:#2563eb}
.sb-nav{flex:1;display:flex;flex-direction:column;gap:4px;padding:0 12px}
.sb-item{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:12px;cursor:pointer;font-size:14px;font-weight:500;color:#64748b;transition:all .2s;border:none;background:transparent;font-family:'DM Sans',sans-serif;text-align:left;width:100%;position:relative}
.sb-item:hover{background:#f0f5ff;color:#1a3a6e}
.sb-item.on{background:#eff6ff;color:#2563eb;font-weight:600}
.sb-item.on::before{content:'';position:absolute;left:0;top:50%;transform:translateY(-50%);width:3px;height:60%;background:#2563eb;border-radius:0 2px 2px 0}
.sb-item.locked{opacity:.55}
.sb-ico{font-size:18px;width:22px;text-align:center}
.sb-inf{flex:1}
.sb-sub{font-size:10px;color:#94a3b8;font-weight:400;margin-top:1px}
.sb-item.on .sb-sub{color:#93c5fd}
.lock{font-size:12px;color:#cbd5e1}
.sb-plan{margin:12px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:12px;padding:14px;border:1px solid #bfdbfe}
.sb-plbl{font-size:11px;color:#64748b;font-weight:500;margin-bottom:4px}
.sb-pname{font-size:14px;font-weight:700;color:#1a3a6e;margin-bottom:8px}
.upg-btn{width:100%;padding:8px;background:linear-gradient(135deg,#1a3a6e,#2563eb);color:#fff;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .2s}
.upg-btn:hover{opacity:.9}
.main{flex:1;display:flex;flex-direction:column}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:20px 36px;background:#fff;border-bottom:1px solid #e8effe;box-shadow:0 2px 8px rgba(26,58,110,.04)}
.tb-l h2{font-family:'Playfair Display',serif;font-size:22px;color:#1a3a6e;font-weight:700}
.tb-l p{font-size:13px;color:#94a3b8;margin-top:2px}
.tb-r{display:flex;align-items:center;gap:14px}
.avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#1a3a6e,#2563eb);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:15px}
.gear{width:38px;height:38px;border-radius:10px;background:#f0f5ff;border:1.5px solid #dbeafe;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;transition:all .2s;color:#2563eb}
.gear:hover{background:#dbeafe}
.cnt{flex:1;padding:36px}
.sh{max-width:720px;margin:0 auto 48px;text-align:center}
.sh h1{font-family:'Playfair Display',serif;font-size:32px;color:#1a3a6e;font-weight:900;margin-bottom:8px}
.sh p{font-size:15px;color:#64748b}
.sbar{display:flex;align-items:center;background:#fff;border:2px solid #e2e8f0;border-radius:14px;padding:6px 6px 6px 20px;margin-top:24px;box-shadow:0 4px 20px rgba(26,58,110,.08);transition:border-color .2s}
.sbar:focus-within{border-color:#2563eb}
.sbar input{flex:1;border:none;outline:none;font-family:'DM Sans',sans-serif;font-size:15px;color:#1e293b;background:transparent}
.sbar input::placeholder{color:#94a3b8}
.ssub{background:linear-gradient(135deg,#1a3a6e,#2563eb);color:#fff;border:none;border-radius:10px;padding:11px 22px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;transition:all .2s;white-space:nowrap}
.ssub:hover{opacity:.9}
.ssub:disabled{opacity:.5;cursor:not-allowed}
.sec-t{font-family:'Playfair Display',serif;font-size:26px;color:#1a3a6e;font-weight:900;margin-bottom:8px}
.sec-s{font-size:14px;color:#64748b;margin-bottom:28px}
.ta{width:100%;min-height:120px;padding:16px;border:2px solid #e2e8f0;border-radius:12px;font-family:'DM Sans',sans-serif;font-size:14px;color:#1e293b;resize:vertical;outline:none;background:#fafbfe;transition:border-color .2s;margin-bottom:14px}
.ta:focus{border-color:#2563eb;background:#fff}
.cgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.rbox{background:#fff;border:2px solid #bfdbfe;border-radius:14px;padding:20px;margin-top:24px}
.mov{position:fixed;inset:0;background:rgba(26,58,110,.4);display:flex;align-items:center;justify-content:center;z-index:600;padding:20px;backdrop-filter:blur(4px)}
.mod{background:#fff;border-radius:20px;padding:36px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.2);text-align:center}
.mod h3{font-family:'Playfair Display',serif;font-size:22px;color:#1a3a6e;font-weight:900;margin-bottom:10px}
.mod p{font-size:14px;color:#64748b;margin-bottom:24px;line-height:1.6}
.macts{display:flex;gap:10px}
.mcl{flex:1;padding:11px;background:#f1f5f9;border:none;border-radius:9px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#475569;cursor:pointer;transition:all .2s}
.mcl:hover{background:#e2e8f0}
.sug{background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;padding:7px 14px;font-size:12px;color:#475569;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
.sug:hover{border-color:#2563eb;color:#2563eb}
.ubadge{font-size:11px;background:#eff6ff;color:#2563eb;border-radius:6px;padding:2px 7px;font-weight:700}
.res-txt{white-space:pre-wrap;font-size:14px;line-height:1.6;color:#334155;background:#fafbfe;padding:20px;border-radius:12px;border:1px solid #e2e8f0;margin-top:20px}
`;

export default function App() {
  // State
  const [view,setView]         = useState<View>("landing");
  const [lang,setLang]         = useState<Lang>("it");
  const [mode,setMode]         = useState<AuthMode>("login");
  const [billing,setBilling]   = useState<"monthly"|"yearly">("monthly");
  const [selPlan,setSelPlan]   = useState<Plan|null>(null);
  const [showCard,setShowCard] = useState(false);
  const [showLang,setShowLang] = useState(false);
  const [showUsr,setShowUsr]   = useState(false);
  const [tab,setTab]           = useState<SidebarItem>("ricerca");
  const [showUpg,setShowUpg]   = useState(false);
  const [showLim,setShowLim]   = useState(false);
  
  // Auth state
  const [token, setToken]       = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser]         = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  
  // Form state
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  
  // Feature state
  const [sq,setSq]             = useState("");
  const [dq,setDq]             = useState("");
  const [deepResult, setDeepResult] = useState("");
  const [deepLoading, setDeepLoading] = useState(false);
  
  const [buyPrice, setBuyPrice]   = useState("");
  const [rentMonth, setRentMonth] = useState(""); // Usato come "Affitto" o parametro generico
  const [surface, setSurface]     = useState("");
  const [city, setCity]           = useState("");
  const [renovLvl, setRenovLvl]   = useState<RenovationLevel>("medio"); // NUOVO STATO
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const t   = T[lang];
  const M   = billing==="yearly";
  const proP= M?(5.99*.8).toFixed(2):"5.99";
  const plP = M?(9.99*.8).toFixed(2):"9.99";
  const per = M?t.perYear:t.perMonth;

  useEffect(() => {
    if (token) {
      fetchUser();
    }
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    if (tokenParam) {
      localStorage.setItem('token', tokenParam);
      setToken(tokenParam);
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchUser().then(() => setView('dashboard'));
    }
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        localStorage.removeItem("token");
        setToken(null);
      }
    } catch (err) {
      console.error("Failed to fetch user:", err);
    }
  };

  const handleRegister = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        setToken(data.access_token);
        await fetchUser();
        setView("pricing");
      } else {
        const err = await res.json();
        setAuthError(err.detail || "Registration failed");
      }
    } catch (err) {
      setAuthError("Network error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);
      
      const res = await fetch(`${API_BASE}/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.access_token);
        setToken(data.access_token);
        await fetchUser();
        setView("dashboard");
      } else {
        setAuthError(t.authError || "Invalid credentials");
      }
    } catch (err) {
      setAuthError("Network error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setView("landing");
  };

  const handleUpgrade = async (plan: Plan) => {
    if (!token) {
      alert("Errore: Non sei loggato!");
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/billing/upgrade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ plan })
      });
      
      if (res.ok) {
        await fetchUser();
        setShowCard(false);
        setView("dashboard");
        alert("Piano attivato con successo! 🎉");
      } else {
        const errData = await res.json();
        alert(`Errore durante l'attivazione: ${errData.detail || "Errore sconosciuto"}`);
        if (res.status === 401) handleLogout();
      }
    } catch (err) {
      alert("Errore di connessione al server.");
    }
  };

  const handleDeepResearch = async () => {
    if (!token || !dq.trim()) return;
    setDeepLoading(true);
    setDeepResult("");
    try {
      const res = await fetch(`${API_BASE}/features/deep-research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: dq })
      });
      if (res.ok) {
        const data = await res.json();
        setDeepResult(data.result);
        await fetchUser();
      } else if (res.status === 403) {
        setShowUpg(true);
      } else if (res.status === 429) {
        setShowLim(true);
      }
    } catch (err) {
      console.error("Deep research failed:", err);
    } finally {
      setDeepLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!token || !buyPrice || !surface) return;
    setCalcLoading(true);
    setCalcResult(null);
    try {
      const res = await fetch(`${API_BASE}/features/calculate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          buy_price: parseFloat(buyPrice),
          surface: parseFloat(surface),
          city,
          renovation_level: renovLvl // NUOVO CAMPO
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCalcResult(data);
        await fetchUser();
      } else if (res.status === 403) {
        setShowUpg(true);
      } else if (res.status === 429) {
        setShowLim(true);
      }
    } catch (err) {
      console.error("Calculate failed:", err);
    } finally {
      setCalcLoading(false);
    }
  };

  // NUOVA FUNZIONE: Download Report
  const handleDownloadReport = async () => {
    if(!calcResult) return;
    try {
        const res = await fetch(`${API_BASE}/features/generate-report`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                buy_price: parseFloat(buyPrice),
                surface: parseFloat(surface),
                city,
                renovation_level: renovLvl,
                ...calcResult // Passa anche i risultati calcolati
            })
        });
        if(res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Report_Immobiliare_${city}.docx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    } catch(e) {
        alert("Errore download report");
    }
  };

  const canUse=(f:SidebarItem)=>{
    if(!user) return false;
    if(f==="ricerca")return true;
    if(user.plan==="free")return false;
    if(user.plan==="plus")return true;
    return f==="deepresearch"?user.usage.deepresearch<2:user.usage.calcola<2;
  };
  
  const go=(item:SidebarItem)=>{
    if(item==="ricerca"){setTab(item);return;}
    if(!user || user.plan==="free"){setShowUpg(true);return;}
    if(!canUse(item)){setShowLim(true);return;}
    setTab(item);
  };

  const LangDrop=()=>(
    <div className="lang-wrap" onClick={e=>e.stopPropagation()}>
      <button className="lang-btn" onClick={()=>{setShowLang(v=>!v);setShowUsr(false);}}>
        🌐 {FLAGS[lang]} <span style={{fontSize:10,color:'#94a3b8'}}>▼</span>
      </button>
      {showLang&&<div className="lang-drop">
        {(Object.keys(FLAGS) as Lang[]).map(l=>(
          <div key={l} className={`lang-opt${lang===l?" on":""}`} onClick={()=>{setLang(l);setShowLang(false);}}>
            {FLAGS[l]} {LABELS[l]}
          </div>
        ))}
      </div>}
    </div>
  );

  // LANDING
  if(view==="landing") return(<>
    <style>{css}</style>
    <div className="land" onClick={()=>{setShowLang(false);setShowUsr(false);}}>
      <nav className="nav" onClick={e=>e.stopPropagation()}>
        <div className="logo">BIG HOUSE</div>
        <div className="nav-r">
          <LangDrop/>
          {token ? (
            <button className="usr-btn" onClick={()=>setView("dashboard")}>
              <div className="usr-ico">👤</div><span>{user?.name || "Dashboard"}</span>
            </button>
          ) : (
            <div className="lang-wrap">
              <button className="usr-btn" onClick={()=>{setShowUsr(v=>!v);setShowLang(false);}}>
                <div className="usr-ico">👤</div><span>{t.login} / {t.register}</span>
              </button>
              {showUsr&&<div className="usr-drop">
                <div className="usr-item" onClick={()=>{setMode("login");setView("auth");setShowUsr(false);}}>🔑 {t.login}</div>
                <div className="usr-item" onClick={()=>{setMode("register");setView("auth");setShowUsr(false);}}>✨ {t.register}</div>
              </div>}
            </div>
          )}
        </div>
      </nav>
      <div className="hero">
        <div className="badge">{t.heroBadge}</div>
        <h1 className="h-title">BIG <span>HOUSE</span></h1>
        <p className="h-sub">{t.tagline}</p>
        <div className="h-acts">
          {!token && <button className="btn-p" onClick={()=>{setMode("register");setView("auth");}}>✨ {t.register}</button>}
          {!token && <button className="btn-o" onClick={()=>{setMode("login");setView("auth");}}>{t.login}</button>}
          {token && <button className="btn-p" onClick={()=>setView("dashboard")}>Dashboard →</button>}
        </div>
      </div>
    </div>
  </>);

  // AUTH
  if(view==="auth") return(<>
    <style>{css}</style>
    <div className="auth-pg">
      <div className="auth-card">
        <div className="auth-logo">BIG HOUSE</div>
        <p className="auth-sub">{t.tagline}</p>
        <div className="tabs">
          <button className={`tab${mode==="login"?" on":""}`} onClick={()=>{setMode("login");setAuthError("");}}>{t.login}</button>
          <button className={`tab${mode==="register"?" on":""}`} onClick={()=>{setMode("register");setAuthError("");}}>{t.register}</button>
        </div>
        {authError && <div className="err">{authError}</div>}
        {mode==="register"&&<div className="fg"><label className="fl">{t.name}</label><input className="fi" type="text" placeholder={t.namePh} value={name} onChange={e=>setName(e.target.value)}/></div>}
        <div className="fg"><label className="fl">{t.email}</label><input className="fi" type="email" placeholder={t.emailPh} value={email} onChange={e=>setEmail(e.target.value)}/></div>
        <div className="fg"><label className="fl">{t.password}</label><input className="fi" type="password" placeholder={t.passPh} value={password} onChange={e=>setPassword(e.target.value)}/></div>
        <button className="abtn" disabled={authLoading} onClick={mode==="login"?handleLogin:handleRegister}>
          {authLoading ? t.loading : (mode==="login"?t.login:t.register)}
        </button>
        
        <div className="divider">
          <span>{t.or}</span>
        </div>
        <button className="gbtn" onClick={() => window.location.href = GOOGLE_AUTH_URL}>
          <span style={{fontSize:18}}>G</span> {t.continueGoogle || "Continue with Google"}
        </button>

        <div className="sw">{mode==="login"?t.noAccount:t.haveAccount}{" "}
          <button onClick={()=>{setMode(mode==="login"?"register":"login");setAuthError("");}}>{mode==="login"?t.register:t.login}</button>
        </div>
      </div>
    </div>
  </>);

  // PRICING
  if(view==="pricing") return(<>
    <style>{css}</style>
    <div className="price-pg">
      <div className="ph">
        <div style={{fontFamily:"'Playfair Display',serif",fontSize:14,letterSpacing:3,color:'#2563eb',fontWeight:900,marginBottom:10}}>BIG HOUSE</div>
        <h1 className="pt">{t.choosePlan}</h1>
        <p className="ps">{t.planSub}</p>
      </div>
      <div className="btog">
        <span className={`tl${billing==="monthly"?" on":""}`}>{t.monthly}</span>
        <button className={`tog${billing==="yearly"?" on":""}`} onClick={()=>setBilling(b=>b==="monthly"?"yearly":"monthly")}/>
        <span className={`tl${billing==="yearly"?" on":""}`}>{t.yearly}</span>
        {billing==="yearly"&&<span className="sbadge">{t.saveYearly}</span>}
      </div>
      <div className="plans">
        <div className="plan" onClick={()=>{handleUpgrade("free");}}>
          <div className="pname">{t.freePlan}</div>
          <div className="pprice">€0</div><div className="pper">{per}</div>
          <div className="pdesc">{t.freeDesc}</div>
          <ul className="pfeats">
            <li><span className="ficon">✓</span>{t.ff1}</li><li><span className="ficon">✓</span>{t.ff2}</li>
            <li><span className="ficon">✓</span>{t.ff3}</li>
            <li style={{opacity:.4}}><span>✗</span>{t.fnd}</li><li style={{opacity:.4}}><span>✗</span>{t.fnc}</li>
          </ul>
          <button className="pcta ol">{t.startFree}</button>
        </div>
        <div className="plan ft" onClick={()=>{setSelPlan("pro");setShowCard(true);}}>
          <div className="pbadge">{t.popular}</div>
          <div className="pname">{t.proPlan}</div>
          <div className="pprice">€{proP}</div><div className="pper">{per}</div>
          <div className="pdesc">{t.proDesc}</div>
          <ul className="pfeats">
            <li><span className="ficon">✓</span>{t.fp1}</li><li><span className="ficon">✓</span>{t.fp2}</li>
            <li><span className="ficon">✓</span>{t.fp3}</li><li><span className="ficon">✓</span>{t.fp4}</li>
            <li><span className="ficon">✓</span>{t.fp5}</li>
          </ul>
          <button className="pcta wh">{t.continueWith} Pro</button>
        </div>
        <div className="plan" onClick={()=>{setSelPlan("plus");setShowCard(true);}}>
          <div className="pname">{t.plusPlan}</div>
          <div className="pprice">€{plP}</div><div className="pper">{per}</div>
          <div className="pdesc">{t.plusDesc}</div>
          <ul className="pfeats">
            <li><span className="ficon">✓</span>{t.fpl1}</li><li><span className="ficon">✓</span>{t.fpl2}</li>
            <li><span className="ficon">✓</span>{t.fpl3}</li><li><span className="ficon">✓</span>{t.fpl4}</li>
            <li><span className="ficon">✓</span>{t.fpl5}</li>
          </ul>
          <button className="pcta ol">{t.continueWith} Plus</button>
        </div>
      </div>
      {showCard&&<div className="cov" onClick={()=>setShowCard(false)}>
        <div className="cmod" onClick={e=>e.stopPropagation()}>
          <div className="ctit">💳 {t.addCard}</div>
          <p className="csub">{t.cardSub} <strong>{selPlan==="pro"?"Pro":"Plus"}</strong> — €{selPlan==="pro"?proP:plP}{per}</p>
          <div className="fg"><label className="fl">{t.cardNum}</label><input className="fi" type="text" placeholder={t.cardNumPh}/></div>
          <div className="crow">
            <div className="fg"><label className="fl">{t.expiry}</label><input className="fi" type="text" placeholder={t.expiryPh}/></div>
            <div className="fg"><label className="fl">{t.cvv}</label><input className="fi" type="text" placeholder="123"/></div>
          </div>
          <div className="cacts">
            <button className="abtn" onClick={()=>handleUpgrade(selPlan!)}>{t.activate}</button>
            <button className="skip" onClick={()=>{setShowCard(false);handleUpgrade("free");}}>{t.skipCard}</button>
          </div>
        </div>
      </div>}
    </div>
  </>);

  // DASHBOARD
  if (!user) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh'}}>Loading...</div>;

  return(<>
    <style>{css}</style>
    <div className="dash" onClick={()=>setShowLang(false)}>
      <aside className="sb">
        <div className="sb-logo">BIG <span>HOUSE</span></div>
        <nav className="sb-nav">
          <button className={`sb-item${tab==="ricerca"?" on":""}`} onClick={()=>go("ricerca")}>
            <span className="sb-ico">🔍</span>
            <div className="sb-inf"><div>{t.ricerca}</div><div className="sb-sub">{t.allPlans}</div></div>
          </button>
          <button className={`sb-item${tab==="deepresearch"?" on":""}${user.plan==="free"?" locked":""}`} onClick={()=>go("deepresearch")}>
            <span className="sb-ico">🔬</span>
            <div className="sb-inf"><div>{t.deepresearch}</div><div className="sb-sub">{t.proFeat}</div></div>
            {user.plan==="free"&&<span className="lock">🔒</span>}
            {user.plan==="pro"&&<span className="ubadge">{2-user.usage.deepresearch}/2</span>}
          </button>
          <button className={`sb-item${tab==="calcola"?" on":""}${user.plan==="free"?" locked":""}`} onClick={()=>go("calcola")}>
            <span className="sb-ico">🧮</span>
            <div className="sb-inf"><div>{t.calcola}</div><div className="sb-sub">{t.proFeat}</div></div>
            {user.plan==="free"&&<span className="lock">🔒</span>}
            {user.plan==="pro"&&<span className="ubadge">{2-user.usage.calcola}/2</span>}
          </button>
        </nav>
        <div className="sb-plan">
          <div className="sb-plbl">{t.activePlan}</div>
          <div className="sb-pname">{user.plan==="free"?"🆓 Free":user.plan==="pro"?"⚡ Pro":"👑 Plus"}</div>
          {user.plan!=="plus"&&<button className="upg-btn" onClick={()=>setView("pricing")}>{user.plan==="free"?t.upgToPro:t.upgToPlus}</button>}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="tb-l">
            <h2>{t.welcome}, {user.name} 👋</h2>
            <p>{new Date().toLocaleDateString(LOCALES[lang],{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <div className="tb-r">
            <LangDrop/>
            <button className="gear" title={t.settings}>⚙️</button>
            <div className="lang-wrap">
              <div className="avatar" onClick={()=>setShowUsr(v=>!v)}>{user.name[0].toUpperCase()}</div>
              {showUsr&&<div className="usr-drop" style={{right:0}}>
                <div className="usr-item" onClick={handleLogout}>🚪 {t.logout}</div>
              </div>}
            </div>
          </div>
        </header>

        <div className="cnt">
          {tab==="ricerca"&&<div className="sh">
            <h1>{t.dashTitle}</h1>
            <p>{t.dashSub}</p>
            <div className="sbar">
              <span style={{fontSize:18,marginRight:4}}>🔍</span>
              <input value={sq} onChange={e=>setSq(e.target.value)} placeholder={t.searchPh}/>
              <button className="ssub">{t.analyze}</button>
            </div>
            <div style={{display:'flex',gap:10,marginTop:16,flexWrap:'wrap',justifyContent:'center'}}>
              {[t.sug1,t.sug2,t.sug3,t.sug4].map(s=>(
                <button key={s} className="sug" onClick={()=>setSq(s)}>{s}</button>
              ))}
            </div>
          </div>}

          {tab==="deepresearch"&&<div style={{maxWidth:720,margin:'0 auto'}}>
            <h2 className="sec-t">🔬 {t.deepresearch}</h2>
            <p className="sec-s">{t.deepTitle} {user.plan==="pro"?`${t.deepUsage} ${2-user.usage.deepresearch}/2`:t.deepUnlimited}</p>
            <textarea className="ta" value={dq} onChange={e=>setDq(e.target.value)} placeholder={t.deepPh}/>
            
            {/* SUGGERIMENTI RAPIDI PER DEEP RESEARCH */}
            <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                <button className="sug" onClick={()=>setDq("Cercami una casa da ristrutturare a Parigi centro, 110mq, ROI 22%")}>🇫🇷 Parigi 110mq ROI 22%</button>
                <button className="sug" onClick={()=>setDq("Investimento Milano NoLo bilocale da mettere a reddito")}>🇮🇹 Milano NoLo Reddito</button>
                <button className="sug" onClick={()=>setDq("Analisi mercato affitti brevi Roma Centro Storico")}>🇮🇹 Roma Affitti Brevi</button>
            </div>

            <button className="abtn" disabled={deepLoading||!dq.trim()} style={{maxWidth:280}} onClick={handleDeepResearch}>
              {deepLoading ? t.loading : t.startDeep}
            </button>
            {deepResult && <div className="res-txt">{deepResult}</div>}
          </div>}

          {tab==="calcola"&&<div style={{maxWidth:720,margin:'0 auto'}}>
            <h2 className="sec-t">🧮 {t.calcola}</h2>
            <p className="sec-s">{t.calcSub} {user.plan==="pro"?`${t.calcUsage} ${2-user.usage.calcola}/2`:t.calcUnlimited}</p>
            <div className="cgrid">
              <div className="fg"><label className="fl">{t.buyPrice}</label><input className="fi" type="number" placeholder={t.buyPh} value={buyPrice} onChange={e=>setBuyPrice(e.target.value)}/></div>
              <div className="fg"><label className="fl">{t.surface}</label><input className="fi" type="number" placeholder={t.surfPh} value={surface} onChange={e=>setSurface(e.target.value)}/></div>
              <div className="fg"><label className="fl">{t.city}</label><input className="fi" type="text" placeholder={t.cityPh} value={city} onChange={e=>setCity(e.target.value)}/></div>
              
              {/* NUOVO SELETTORE LIVELLO RISTRUTTURAZIONE */}
              <div className="fg">
                  <label className="fl">{t.renovLvl}</label>
                  <select className="fi" value={renovLvl} onChange={e=>setRenovLvl(e.target.value as RenovationLevel)}>
                      <option value="basso">{t.low}</option>
                      <option value="medio">{t.med}</option>
                      <option value="alto">{t.high}</option>
                  </select>
              </div>
            </div>
            <button className="abtn" disabled={calcLoading||!buyPrice||!surface} style={{maxWidth:220}} onClick={handleCalculate}>
              {calcLoading ? t.loading : t.calcBtn}
            </button>
            
            {/* RISULTATI CALCOLO AGGIORNATI */}
            {calcResult&&<div className="rbox">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,textAlign:'center',marginBottom:20}}>
                <div>
                  <div style={{fontSize:13,color:'#64748b',marginBottom:8}}>Costo Ristrutturazione</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:'#1a3a6e'}}>€ {calcResult.renovation_cost}</div>
                </div>
                <div>
                  <div style={{fontSize:13,color:'#64748b',marginBottom:8}}>Valore Finale Stimato</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:900,color:'#1a3a6e'}}>€ {calcResult.estimated_value}</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,textAlign:'center',borderTop:'1px solid #e2e8f0',paddingTop:20}}>
                <div>
                  <div style={{fontSize:13,color:'#64748b',marginBottom:8}}>ROI Stimato</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,color:'#16a34a'}}>{calcResult.roi}%</div>
                </div>
                <div>
                  <div style={{fontSize:13,color:'#64748b',marginBottom:8}}>Tempi Cantiere</div>
                  <div style={{fontFamily:"'Playfair Display',serif",fontSize:32,fontWeight:900,color:'#1a3a6e'}}>{calcResult.duration_months} Mesi</div>
                </div>
              </div>
              
              {/* PULSANTE DOWNLOAD REPORT */}
              <button className="abtn" style={{marginTop:20,background:'#fff',color:'#1a3a6e',border:'2px solid #1a3a6e'}} onClick={handleDownloadReport}>
                  📄 Scarica Report Completo (.docx)
              </button>
            </div>}
          </div>}
        </div>
      </main>

      {showUpg&&<div className="mov" onClick={()=>setShowUpg(false)}>
        <div className="mod" onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:48,marginBottom:12}}>🔒</div>
          <h3>{t.upgradeTitle}</h3><p>{t.upgradeMsg}</p>
          <div className="macts">
            <button className="mcl" onClick={()=>setShowUpg(false)}>{t.cancel}</button>
            <button className="abtn" style={{flex:1}} onClick={()=>{setShowUpg(false);setView("pricing");}}>{t.upgradeCta}</button>
          </div>
        </div>
      </div>}

      {showLim&&<div className="mov" onClick={()=>setShowLim(false)}>
        <div className="mod" onClick={e=>e.stopPropagation()}>
          <div style={{fontSize:48,marginBottom:12}}>⏱️</div>
          <h3>{t.limitTitle}</h3><p>{t.limitMsg}</p>
          <div className="macts">
            <button className="mcl" onClick={()=>setShowLim(false)}>{t.close}</button>
            <button className="abtn" style={{flex:1}} onClick={()=>{setShowLim(false);setView("pricing");}}>{t.upgPlus}</button>
          </div>
        </div>
      </div>}
    </div>
  </>);
}