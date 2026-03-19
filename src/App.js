import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Building2, Users, FileText, CreditCard, Settings, LogOut,
  LayoutDashboard, Plus, X, AlertTriangle, Euro, TrendingUp,
  Printer, Trash2, CheckCircle, FolderOpen, Upload, Download, File,
  MessageSquare, Send, Bot, Calendar
} from "lucide-react";

const supabase = createClient(
  "https://evibyszadyruoxfiqgnu.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2aWJ5c3phZHlydW94ZmlxZ251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzOTg3MDgsImV4cCI6MjA4ODk3NDcwOH0.-JjpyczRxSA7A5EybqDo0ZJlaEUGYbrmdS8rnnOweE0"
);
const ANTHROPIC_KEY = process.env.REACT_APP_ANTHROPIC_KEY;

const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_SHORT = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const today = () => new Date().toISOString().slice(0, 10);
const now = new Date();

const DOC_TYPES = [
  { v: "bail", l: "Bail & avenant", color: "#8b5cf6" },
  { v: "avis_echeance", l: "Avis d'échéance", color: "#3b82f6" },
  { v: "facture", l: "Facture acquittée", color: "#10b981" },
  { v: "commandement", l: "Commandement de payer", color: "#dc2626" },
];

const fmtSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
  return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
};

const getLoyerActuel = (bail) => {
  if (!bail.date_debut) return bail.loyer_ht;
  const debut = new Date(bail.date_debut);
  const n = new Date();
  const moisEcoules = (n.getFullYear() - debut.getFullYear()) * 12 + (n.getMonth() - debut.getMonth());
  if (moisEcoules < 12 && bail.loyer_an1) return bail.loyer_an1;
  if (moisEcoules < 24 && bail.loyer_an2) return bail.loyer_an2;
  return bail.loyer_ht;
};

const getLoyerPourMois = (bail, mois, annee) => {
  if (!bail.date_debut) return bail.loyer_ht;
  const debut = new Date(bail.date_debut);
  const target = new Date(annee, mois, 1);
  const moisEcoules = (target.getFullYear() - debut.getFullYear()) * 12 + (target.getMonth() - debut.getMonth());
  if (moisEcoules < 12 && bail.loyer_an1) return bail.loyer_an1;
  if (moisEcoules < 24 && bail.loyer_an2) return bail.loyer_an2;
  return bail.loyer_ht;
};

const getAnneeLabel = (bail) => {
  if (!bail.date_debut) return null;
  const debut = new Date(bail.date_debut);
  const n = new Date();
  const moisEcoules = (n.getFullYear() - debut.getFullYear()) * 12 + (n.getMonth() - debut.getMonth());
  if (moisEcoules < 12 && bail.loyer_an1) return "Année 1";
  if (moisEcoules < 24 && bail.loyer_an2) return "Année 2";
  return "Année 3+";
};

// ─── PDF GENERATORS ───────────────────────────────────────────────────────────

const pdfAvisEcheance = (bail, bien, loc, soc, mois, annee) => {
  const loyerHT = getLoyerPourMois(bail, mois, annee);
  const total = loyerHT + bail.charges;
  const periode = `${MONTHS[mois]} ${annee}`;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Avis d'échéance</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2d4e;padding:48px;font-size:13px;line-height:1.6}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a2d4e;padding-bottom:20px;margin-bottom:36px}.logo{font-size:22px;font-weight:900;letter-spacing:4px}.logo small{display:block;font-size:10px;color:#94a3b8;font-weight:400;margin-top:2px}.doc-title h1{font-size:18px;font-weight:700;text-align:right}.doc-title p{font-size:12px;color:#64748b;text-align:right}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:28px}.bloc h3{font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px}.bien-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#1a2d4e;color:#fff;padding:10px 14px;text-align:left;font-size:11px}td{padding:10px 14px;border-bottom:1px solid #f1f5f9}.tot td{background:#eff6ff;font-weight:700;border-top:2px solid #1a2d4e}.iban{background:#1a2d4e;color:#fff;border-radius:8px;padding:14px 20px;display:flex;justify-content:space-between;margin-bottom:20px}.iban .lbl{font-size:10px;opacity:.6;margin-bottom:3px}.iban .val{font-size:14px;font-weight:600}.note{font-size:11px;color:#94a3b8;font-style:italic}.footer{text-align:center;color:#94a3b8;font-size:11px;margin-top:48px;padding-top:16px;border-top:1px solid #f1f5f9}@media print{@page{margin:1.5cm}}</style></head><body>
  <div class="hdr"><div class="logo">${soc?.nom_affiche||soc?.nom||"PHANTOM"}<small>Gestion Immobilière</small></div><div class="doc-title"><h1>Avis d'Échéance</h1><p>Période : ${periode}</p><p>Émis le ${new Date().toLocaleDateString("fr-FR")}</p></div></div>
  <div class="grid2"><div class="bloc"><h3>Bailleur</h3><p><strong>${soc?.nom||"—"}</strong>${soc?.siret?`<br>SIRET : ${soc.siret}`:""}</p></div><div class="bloc"><h3>Locataire</h3><p><strong>${loc.raison_sociale||`${loc.prenom} ${loc.nom}`}</strong><br>${loc.email||""}<br>${loc.telephone||""}</p></div></div>
  <div class="bien-box"><strong>Bien loué :</strong> ${bien.adresse}, ${bien.ville} ${bien.code_postal} | ${bien.surface} m²${bail.utilisation?` | ${bail.utilisation}`:""}</div>
  <table><thead><tr><th>Désignation</th><th style="text-align:right">Montant HT</th><th style="text-align:right">TVA 20%</th><th style="text-align:right">TTC</th></tr></thead><tbody>
  <tr><td>Loyer hors charges</td><td style="text-align:right">${loyerHT.toFixed(2)} €</td><td style="text-align:right">${(loyerHT*0.2).toFixed(2)} €</td><td style="text-align:right">${(loyerHT*1.2).toFixed(2)} €</td></tr>
  ${bail.charges>0?`<tr><td>Provisions sur charges</td><td style="text-align:right">${bail.charges.toFixed(2)} €</td><td style="text-align:right">${(bail.charges*0.2).toFixed(2)} €</td><td style="text-align:right">${(bail.charges*1.2).toFixed(2)} €</td></tr>`:""}
  <tr class="tot"><td colspan="2"><strong>Total à régler avant le 1er ${periode}</strong></td><td></td><td style="text-align:right"><strong>${(total*1.2).toFixed(2)} €</strong></td></tr>
  </tbody></table>
  ${soc?.iban?`<div class="iban"><div><div class="lbl">Virement — IBAN</div><div class="val">${soc.iban}</div></div>${soc.bic?`<div><div class="lbl">BIC</div><div class="val">${soc.bic}</div></div>`:""}</div>`:""}
  <p class="note">Indice de révision : ${bail.indice_revision||"ILC"} — Bail ${bail.type_bail||"commercial"} du ${bail.date_debut||"—"}</p>
  <div class="footer">${soc?.nom||"PHANTOM"} — ${soc?.siret?`SIRET ${soc.siret}`:""}</div></body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400);
};

const pdfFacture = (bail, bien, loc, soc, mois, annee, numFacture) => {
  const loyerHT = getLoyerPourMois(bail, mois, annee);
  const chargesHT = bail.charges;
  const totalHT = loyerHT + chargesHT;
  const tva = totalHT * 0.20;
  const totalTTC = totalHT + tva;
  const periode = `${MONTHS[mois]} ${annee}`;
  const dateEmission = new Date().toLocaleDateString("fr-FR");
  const num = numFacture || `FAC-${annee}${String(mois+1).padStart(2,"0")}-${bail.id?.slice(0,4).toUpperCase()}`;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Facture ${num}</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2d4e;padding:48px;font-size:13px;line-height:1.6}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1a2d4e;padding-bottom:20px;margin-bottom:36px}.logo{font-size:24px;font-weight:900;letter-spacing:4px}.logo small{display:block;font-size:10px;color:#94a3b8;font-weight:400;margin-top:2px}.doc-info{text-align:right}.doc-info h1{font-size:20px;font-weight:700;color:#1a2d4e}.doc-info .num{font-size:14px;color:#3b82f6;font-weight:600;margin-top:4px}.doc-info p{font-size:12px;color:#64748b}.parties{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:28px;background:#f8fafc;padding:20px;border-radius:8px}.partie h3{font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;letter-spacing:1px}.partie p{font-size:13px;line-height:1.7}.bien-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 18px;margin-bottom:24px;font-size:13px}table{width:100%;border-collapse:collapse;margin-bottom:24px}thead tr{background:#1a2d4e;color:#fff}th{padding:10px 14px;text-align:left;font-size:11px;letter-spacing:.5px}td{padding:12px 14px;border-bottom:1px solid #f1f5f9;font-size:13px}.subtotal td{background:#f8fafc;font-weight:500}.tva-row td{color:#64748b}.total-row td{background:#1a2d4e;color:#fff;font-weight:700;font-size:14px}.iban{background:#1a2d4e;color:#fff;border-radius:8px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.iban .lbl{font-size:10px;opacity:.6;margin-bottom:3px}.iban .val{font-size:13px;font-weight:600;letter-spacing:1px}.legal{font-size:11px;color:#94a3b8;margin-top:12px}.footer{text-align:center;color:#94a3b8;font-size:10px;margin-top:48px;padding-top:16px;border-top:1px solid #f1f5f9}@media print{@page{margin:1.5cm}}</style></head><body>
  <div class="hdr"><div class="logo">${soc?.nom_affiche||soc?.nom||"PHANTOM"}<small>Gestion Immobilière</small></div><div class="doc-info"><h1>FACTURE</h1><div class="num">${num}</div><p>Date : ${dateEmission}</p><p>Période : ${periode}</p></div></div>
  <div class="parties"><div class="partie"><h3>Vendeur (Bailleur)</h3><p><strong>${soc?.nom||"—"}</strong>${soc?.adresse?`<br>${soc.adresse}`:""}<br>${soc?.code_postal||""} ${soc?.ville||""}${soc?.siret?`<br>SIRET : ${soc.siret}`:""}<br>${soc?.tva_intracommunautaire?`TVA : ${soc.tva_intracommunautaire}`:""}</p></div><div class="partie"><h3>Client (Preneur)</h3><p><strong>${loc.raison_sociale||`${loc.prenom} ${loc.nom}`}</strong>${loc.adresse?`<br>${loc.adresse}`:""}<br>${loc.code_postal||""} ${loc.ville||""}<br>${loc.email||""}<br>${loc.telephone||""}</p></div></div>
  <div class="bien-box">📍 <strong>Objet :</strong> Loyer ${bail.type_bail||"commercial"} — ${bien.adresse}, ${bien.ville} ${bien.code_postal} | ${bien.surface} m²${bail.utilisation?` | Activité : ${bail.utilisation}`:""}</div>
  <table><thead><tr><th>Désignation</th><th>Période</th><th style="text-align:right">P.U. HT</th><th style="text-align:right">Qté</th><th style="text-align:right">Montant HT</th></tr></thead><tbody>
  <tr><td>Loyer hors charges</td><td>${periode}</td><td style="text-align:right">${loyerHT.toFixed(2)} €</td><td style="text-align:right">1</td><td style="text-align:right">${loyerHT.toFixed(2)} €</td></tr>
  ${chargesHT>0?`<tr><td>Provisions sur charges</td><td>${periode}</td><td style="text-align:right">${chargesHT.toFixed(2)} €</td><td style="text-align:right">1</td><td style="text-align:right">${chargesHT.toFixed(2)} €</td></tr>`:""}
  <tr class="subtotal"><td colspan="4"><strong>Sous-total HT</strong></td><td style="text-align:right"><strong>${totalHT.toFixed(2)} €</strong></td></tr>
  <tr class="tva-row"><td colspan="4">TVA 20%</td><td style="text-align:right">${tva.toFixed(2)} €</td></tr>
  <tr class="total-row"><td colspan="4"><strong>TOTAL TTC</strong></td><td style="text-align:right"><strong>${totalTTC.toFixed(2)} €</strong></td></tr>
  </tbody></table>
  ${soc?.iban?`<div class="iban"><div><div class="lbl">Règlement par virement — IBAN</div><div class="val">${soc.iban}</div></div>${soc.bic?`<div><div class="lbl">BIC</div><div class="val">${soc.bic}</div></div>`:""}</div>`:""}
  <p class="legal">Échéance de paiement : 30 jours — Indemnité forfaitaire de recouvrement : 40 € — Pénalités de retard : 3× taux BCE</p>
  <div class="footer">${soc?.nom||"PHANTOM"} — ${soc?.siret?`SIRET ${soc.siret} — `:""}${soc?.ape?`APE ${soc.ape} — `:""}${soc?.capital?`Capital ${soc.capital} €`:""}</div>
  </body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400);
};

const pdfRelanceAmiable = (bail, bien, loc, soc, transactions) => {
  const impayees = transactions.filter(t => t.bail_id === bail.id && t.statut === "impayé");
  const totalDu = impayees.reduce((s,t) => s + t.montant_loyer + t.montant_charges, 0);
  const periodes = impayees.map(t => `${MONTHS[t.mois]} ${t.annee}`).join(", ");
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Relance amiable</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2d4e;padding:48px;font-size:13px;line-height:1.8}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a2d4e;padding-bottom:20px;margin-bottom:36px}.logo{font-size:22px;font-weight:900;letter-spacing:4px}.logo small{display:block;font-size:10px;color:#94a3b8;font-weight:400;margin-top:2px}.ref{text-align:right;font-size:12px;color:#64748b}.expediteur{margin-bottom:32px}.destinataire{background:#f8fafc;border-left:4px solid #1a2d4e;padding:14px 18px;margin-bottom:32px}.objet{background:#fef9c3;border:1px solid #fde68a;border-radius:6px;padding:10px 16px;margin-bottom:28px;font-weight:600}.corps p{margin-bottom:16px}.montant{background:#fee2e2;border-radius:8px;padding:14px 20px;text-align:center;margin:24px 0;font-size:18px;font-weight:700;color:#dc2626}.iban{background:#1a2d4e;color:#fff;border-radius:8px;padding:14px 20px;margin:20px 0}.iban .lbl{font-size:10px;opacity:.6;margin-bottom:3px}.iban .val{font-size:14px;font-weight:600}.signature{margin-top:48px}.footer{text-align:center;color:#94a3b8;font-size:10px;margin-top:48px;padding-top:16px;border-top:1px solid #f1f5f9}@media print{@page{margin:2cm}}</style></head><body>
  <div class="hdr"><div class="logo">${soc?.nom_affiche||soc?.nom||"PHANTOM"}<small>Gestion Immobilière</small></div><div class="ref"><p>Réf : RELANCE-${new Date().toLocaleDateString("fr-FR").replace(/\//g,"-")}</p><p>Date : ${new Date().toLocaleDateString("fr-FR")}</p></div></div>
  <div class="expediteur"><strong>${soc?.nom||"—"}</strong>${soc?.adresse?`<br>${soc.adresse}`:""}<br>${soc?.code_postal||""} ${soc?.ville||""}</div>
  <div class="destinataire"><strong>${loc.raison_sociale||`${loc.prenom} ${loc.nom}`}</strong>${loc.adresse?`<br>${loc.adresse}`:""}${loc.email?`<br>${loc.email}`:""}</div>
  <div class="objet">Objet : Rappel amiable — Loyers impayés (${periodes})</div>
  <div class="corps">
    <p>Madame, Monsieur,</p>
    <p>Sauf erreur de notre part, nous constatons que le règlement des loyers correspondant aux périodes de <strong>${periodes}</strong> n'a pas encore été effectué à ce jour.</p>
    <p>Nous vous rappelons les montants dus au titre du bail portant sur le local situé au <strong>${bien.adresse}, ${bien.ville}</strong> :</p>
    <div class="montant">Montant total dû : ${fmt(totalDu * 1.2)} TTC</div>
    <p>Nous vous remercions de bien vouloir procéder au règlement de cette somme dans les meilleurs délais par virement bancaire aux coordonnées ci-dessous :</p>
    ${soc?.iban?`<div class="iban"><div class="lbl">IBAN</div><div class="val">${soc.iban}</div>${soc.bic?`<div class="lbl" style="margin-top:8px">BIC</div><div class="val">${soc.bic}</div>`:""}</div>`:""}
    <p>Si ce paiement a déjà été effectué, nous vous prions de ne pas tenir compte de ce courrier et de nous en informer.</p>
    <p>Dans l'attente de votre règlement, nous restons à votre disposition pour tout renseignement complémentaire.</p>
    <p>Nous vous adressons, Madame, Monsieur, nos cordiales salutations.</p>
  </div>
  <div class="signature"><p>${soc?.nom||"—"}</p><br><br><br><p>Signature</p></div>
  <div class="footer">${soc?.nom||"PHANTOM"} — Gestion Immobilière Privée</div>
  </body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400);
};

const pdfMiseEnDemeure = (bail, bien, loc, soc, transactions) => {
  const impayees = transactions.filter(t => t.bail_id === bail.id && t.statut === "impayé");
  const totalDu = impayees.reduce((s,t) => s + t.montant_loyer + t.montant_charges, 0);
  const periodes = impayees.map(t => `${MONTHS[t.mois]} ${t.annee}`).join(", ");
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Mise en demeure</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2d4e;padding:48px;font-size:13px;line-height:1.8}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #dc2626;padding-bottom:20px;margin-bottom:36px}.logo{font-size:22px;font-weight:900;letter-spacing:4px}.logo small{display:block;font-size:10px;color:#94a3b8;font-weight:400;margin-top:2px}.ref{text-align:right;font-size:12px;color:#64748b}.alerte{background:#fff5f5;border:2px solid #dc2626;border-radius:8px;padding:14px 18px;margin-bottom:28px;color:#dc2626;font-weight:700;font-size:14px;text-align:center}.expediteur{margin-bottom:24px}.destinataire{background:#f8fafc;border-left:4px solid #dc2626;padding:14px 18px;margin-bottom:28px}.objet{font-weight:700;font-size:14px;text-decoration:underline;margin-bottom:24px}.corps p{margin-bottom:16px}.montant{background:#dc2626;color:#fff;border-radius:8px;padding:16px 20px;text-align:center;margin:24px 0;font-size:20px;font-weight:700}.delai{background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px 18px;margin:20px 0;font-weight:600}.iban{background:#1a2d4e;color:#fff;border-radius:8px;padding:14px 20px;margin:16px 0}.iban .lbl{font-size:10px;opacity:.6;margin-bottom:3px}.iban .val{font-size:14px;font-weight:600}.signature{margin-top:48px}.footer{text-align:center;color:#94a3b8;font-size:10px;margin-top:48px;padding-top:16px;border-top:1px solid #f1f5f9}@media print{@page{margin:2cm}}</style></head><body>
  <div class="hdr"><div class="logo">${soc?.nom_affiche||soc?.nom||"PHANTOM"}<small>Gestion Immobilière</small></div><div class="ref"><p><strong>LETTRE RECOMMANDÉE</strong></p><p>Réf : MED-${new Date().toLocaleDateString("fr-FR").replace(/\//g,"-")}</p><p>Date : ${new Date().toLocaleDateString("fr-FR")}</p></div></div>
  <div class="alerte">⚠️ MISE EN DEMEURE DE PAYER — DOCUMENT OFFICIEL</div>
  <div class="expediteur"><strong>${soc?.nom||"—"}</strong>${soc?.adresse?`<br>${soc.adresse}`:""}<br>${soc?.code_postal||""} ${soc?.ville||""}</div>
  <div class="destinataire"><strong>${loc.raison_sociale||`${loc.prenom} ${loc.nom}`}</strong>${loc.adresse?`<br>${loc.adresse}`:""}${loc.email?`<br>${loc.email}`:""}</div>
  <p class="objet">Objet : MISE EN DEMEURE DE PAYER — Loyers impayés (${periodes})</p>
  <div class="corps">
    <p>Madame, Monsieur,</p>
    <p>Malgré nos précédentes relances restées sans effet, nous constatons que les loyers correspondant aux périodes de <strong>${periodes}</strong> demeurent impayés à ce jour, concernant le local commercial situé au <strong>${bien.adresse}, ${bien.code_postal} ${bien.ville}</strong>.</p>
    <p>Par la présente, nous vous mettons formellement en demeure de régler la somme totale de :</p>
    <div class="montant">${fmt(totalDu * 1.2)} TTC</div>
    <div class="delai">⏱️ Vous disposez d'un délai de <strong>8 jours</strong> à compter de la réception de ce courrier pour procéder au règlement intégral de cette somme.</div>
    <p>À défaut de paiement dans ce délai, nous nous verrons contraints d'engager une procédure judiciaire à votre encontre, notamment par voie de commandement de payer valant saisie, aux frais exclusifs du locataire défaillant.</p>
    ${soc?.iban?`<div class="iban"><div class="lbl">Règlement par virement — IBAN</div><div class="val">${soc.iban}</div>${soc.bic?`<div class="lbl" style="margin-top:8px">BIC</div><div class="val">${soc.bic}</div>`:""}</div>`:""}
    <p>Nous vous rappelons que conformément à l'article L.145-41 du Code de commerce, le non-paiement des loyers peut entraîner la résiliation judiciaire du bail.</p>
    <p>Dans l'attente de votre règlement immédiat, veuillez agréer, Madame, Monsieur, l'expression de nos salutations.</p>
  </div>
  <div class="signature"><p>${soc?.nom||"—"}</p><br><br><br><p>Signature et cachet</p></div>
  <div class="footer">${soc?.nom||"PHANTOM"} — Gestion Immobilière Privée — ${soc?.siret?`SIRET ${soc.siret}`:""}</div>
  </body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400);
};

const pdfCommandement = (bail, bien, loc, soc, transactions) => {
  const impayees = transactions.filter(t => t.bail_id === bail.id && t.statut === "impayé");
  const totalDu = impayees.reduce((s, t) => s + t.montant_loyer + t.montant_charges, 0);
  const rows = impayees.map(t => `<tr><td>${MONTHS[t.mois]} ${t.annee}</td><td style="text-align:right">${t.montant_loyer.toFixed(2)} €</td><td style="text-align:right">${t.montant_charges.toFixed(2)} €</td><td style="text-align:right">${(t.montant_loyer+t.montant_charges).toFixed(2)} €</td></tr>`).join("");
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Commandement de Payer</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;padding:48px;font-size:13px;line-height:1.6}.hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #dc2626;padding-bottom:20px;margin-bottom:28px}.logo{font-size:22px;font-weight:900;color:#1a2d4e}h1{font-size:20px;font-weight:900;color:#dc2626;text-transform:uppercase}.warning{background:#fff5f5;border:2px solid #dc2626;border-radius:8px;padding:14px 18px;margin-bottom:24px;color:#dc2626;font-weight:600}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:20px}.bloc h3{font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#dc2626;color:#fff;padding:10px 14px;text-align:left;font-size:11px}td{padding:10px 14px;border-bottom:1px solid #f1f5f9}.tot td{background:#fff5f5;font-weight:700;color:#dc2626;border-top:2px solid #dc2626}.legal{background:#f9fafb;border-left:4px solid #dc2626;padding:14px 18px;margin:20px 0;font-size:12px}.sigs{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px}.sig{border-top:1px solid #cbd5e1;padding-top:10px;font-size:11px;color:#94a3b8}@media print{@page{margin:1.5cm}}</style></head><body>
  <div class="hdr"><div class="logo">${soc?.nom_affiche||soc?.nom||"PHANTOM"}</div><div><h1>Commandement de Payer</h1><p style="font-size:12px;color:#94a3b8">Émis le ${new Date().toLocaleDateString("fr-FR")}</p></div></div>
  <div class="warning">⚠ Ce document est un commandement de payer. Faute de règlement sous 2 mois, une procédure judiciaire pourra être engagée.</div>
  <div class="grid2"><div class="bloc"><h3>Bailleur</h3><p><strong>${soc?.nom||"—"}</strong></p></div><div class="bloc"><h3>Locataire</h3><p><strong>${loc.raison_sociale||`${loc.prenom} ${loc.nom}`}</strong><br>${loc.email||""}</p></div></div>
  <p style="margin-bottom:16px"><strong>Bien loué :</strong> ${bien.adresse}, ${bien.ville}</p>
  <table><thead><tr><th>Période</th><th style="text-align:right">Loyer</th><th style="text-align:right">Charges</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${rows}<tr class="tot"><td colspan="3"><strong>TOTAL DÛ</strong></td><td style="text-align:right"><strong>${totalDu.toFixed(2)} €</strong></td></tr></tbody></table>
  <div class="legal">Conformément à la loi n°89-462 du 6 juillet 1989, nous vous mettons en demeure de régler <strong>${totalDu.toFixed(2)} €</strong> dans un délai de deux (2) mois.</div>
  ${soc?.iban?`<p style="margin-top:16px"><strong>Règlement :</strong> IBAN ${soc.iban}${soc.bic?" — BIC "+soc.bic:""}</p>`:""}
  <div class="sigs"><div class="sig"><p>Signature du bailleur</p><br><br></div><div class="sig"><p>Accusé de réception</p><br><br></div></div>
  </body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400);
};

const pdfQuittance = (bail, bien, loc, soc, transaction) => {
  const loyerHT = transaction.montant_loyer;
  const chargesHT = transaction.montant_charges;
  const tvaLoyer = loyerHT * 0.20;
  const tvaCharges = chargesHT * 0.20;
  const totalHT = loyerHT + chargesHT;
  const totalTVA = tvaLoyer + tvaCharges;
  const totalTTC = totalHT + totalTVA;
  const periode = `${MONTHS[transaction.mois]} ${transaction.annee}`;
  const datePaiement = transaction.date_paiement ? new Date(transaction.date_paiement).toLocaleDateString("fr-FR") : "—";
  const nomLocataire = loc.raison_sociale || `${loc.prenom} ${loc.nom}`;
  const adresseLocataire = loc.adresse ? `${loc.adresse}, ${loc.code_postal||""} ${loc.ville||""}` : "";
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Quittance de loyer</title>
  <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2d4e;padding:48px;font-size:13px;line-height:1.6}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a2d4e;padding-bottom:20px;margin-bottom:36px}.logo{font-size:22px;font-weight:900;letter-spacing:4px}.logo small{display:block;font-size:10px;color:#94a3b8;font-weight:400;margin-top:2px}.doc-title h1{font-size:18px;font-weight:700;text-align:right}.doc-title p{font-size:12px;color:#64748b;text-align:right}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:28px}.bloc h3{font-size:10px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px}.bien-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:24px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#1a2d4e;color:#fff;padding:10px 14px;text-align:left;font-size:11px}td{padding:10px 14px;border-bottom:1px solid #f1f5f9}.tot td{background:#eff6ff;font-weight:700;border-top:2px solid #1a2d4e}.iban{background:#1a2d4e;color:#fff;border-radius:8px;padding:14px 20px;display:flex;justify-content:space-between;margin-bottom:20px}.iban .lbl{font-size:10px;opacity:.6;margin-bottom:3px}.iban .val{font-size:14px;font-weight:600}.quittance-box{background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center}.quittance-box p{color:#15803d;font-weight:700;font-size:14px}.footer{text-align:center;color:#94a3b8;font-size:10px;margin-top:48px;padding-top:16px;border-top:1px solid #f1f5f9}@media print{@page{margin:1.5cm}}</style></head><body>
  <div class="hdr"><div class="logo">${soc?.nom_affiche||soc?.nom||"PHANTOM"}<small>Gestion Immobilière</small></div><div class="doc-title"><h1>Quittance de Loyer</h1><p>Période : ${periode}</p><p>Émise le ${new Date().toLocaleDateString("fr-FR")}</p></div></div>
  <div class="quittance-box"><p>✓ Quittance pour solde de tout compte — Paiement reçu le ${datePaiement}</p></div>
  <div class="grid2"><div class="bloc"><h3>Bailleur</h3><p><strong>${soc?.nom||"—"}</strong>${soc?.adresse?`<br>${soc.adresse}`:""}<br>${soc?.code_postal||""} ${soc?.ville||""}${soc?.siret?`<br>SIRET : ${soc.siret}`:""}</p></div><div class="bloc"><h3>Preneur</h3><p><strong>${nomLocataire}</strong>${adresseLocataire?`<br>${adresseLocataire}`:""}</p></div></div>
  <div class="bien-box"><strong>Bien loué :</strong> ${bien.adresse}, ${bien.code_postal||""} ${bien.ville||""} | ${bien.surface} m²</div>
  <table><thead><tr><th>Désignation</th><th>Base</th><th style="text-align:right">Montant HT</th><th style="text-align:right">TVA (20%)</th><th style="text-align:right">Montant TTC</th></tr></thead>
  <tbody><tr><td>Loyer mensuel</td><td>${periode}</td><td style="text-align:right">${loyerHT.toFixed(2)} €</td><td style="text-align:right">${tvaLoyer.toFixed(2)} €</td><td style="text-align:right">${(loyerHT+tvaLoyer).toFixed(2)} €</td></tr>
  ${chargesHT>0?`<tr><td>Provisions sur charges</td><td>${periode}</td><td style="text-align:right">${chargesHT.toFixed(2)} €</td><td style="text-align:right">${tvaCharges.toFixed(2)} €</td><td style="text-align:right">${(chargesHT+tvaCharges).toFixed(2)} €</td></tr>`:""}
  <tr class="tot"><td colspan="2"><strong>TOTAL PAYÉ TTC</strong></td><td style="text-align:right"><strong>${totalHT.toFixed(2)} €</strong></td><td style="text-align:right"><strong>${totalTVA.toFixed(2)} €</strong></td><td style="text-align:right"><strong>${totalTTC.toFixed(2)} €</strong></td></tr>
  </tbody></table>
  <div class="footer">${soc?.nom||"PHANTOM"} — ${soc?.siret?`SIRET ${soc.siret} — `:""}${soc?.tva_intracommunautaire?`TVA ${soc.tva_intracommunautaire} — `:""}${soc?.ape?`APE ${soc.ape}`:""}${soc?.capital?` — Capital ${soc.capital} €`:""}</div>
  </body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400);
};

// ─── DESIGN ATOMS ─────────────────────────────────────────────────────────────

const S = {
  sidebar: { width:240, background:"#1a2d4e", display:"flex", flexDirection:"column", position:"fixed", top:0, left:0, bottom:0, zIndex:100 },
  card: { background:"#fff", borderRadius:14, boxShadow:"0 1px 6px rgba(0,0,0,0.06)", border:"1px solid #f1f5f9" },
  th: { padding:"11px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.5px", background:"#f8fafc" },
  td: { padding:"14px 16px", borderTop:"1px solid #f8fafc", fontSize:14 },
};

const Badge = ({ statut }) => {
  const cfg = { payé:["#dcfce7","#15803d","Payé"], impayé:["#fee2e2","#dc2626","Impayé"], en_attente:["#fef9c3","#b45309","En attente"] }[statut]||["#f1f5f9","#64748b",statut];
  return <span style={{ background:cfg[0], color:cfg[1], padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600 }}>{cfg[2]}</span>;
};

const Label = ({ children }) => <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#64748b", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>{children}</label>;
const Field = ({ label, style, ...p }) => (
  <div style={{ marginBottom:14, ...style }}>
    {label && <Label>{label}</Label>}
    <input style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, outline:"none", color:"#1e293b", fontFamily:"inherit", boxSizing:"border-box" }}
      onFocus={e=>e.target.style.borderColor="#3b82f6"} onBlur={e=>e.target.style.borderColor="#e2e8f0"} {...p} />
  </div>
);
const Sel = ({ label, options, ...p }) => (
  <div style={{ marginBottom:14 }}>
    {label && <Label>{label}</Label>}
    <select style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, color:"#1e293b", background:"#fff", fontFamily:"inherit" }} {...p}>
      {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>
);
const Btn = ({ children, v="primary", style, ...p }) => {
  const s = { primary:{background:"#1a2d4e",color:"#fff",border:"none"}, danger:{background:"#dc2626",color:"#fff",border:"none"}, ghost:{background:"transparent",color:"#64748b",border:"1.5px solid #e2e8f0"}, green:{background:"#16a34a",color:"#fff",border:"none"} }[v];
  return <button style={{ ...s, padding:"9px 18px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:6, ...style }} {...p}>{children}</button>;
};
const Modal = ({ title, onClose, width=520, children }) => (
  <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000 }}>
    <div style={{ background:"#fff", borderRadius:16, padding:32, width, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 24px 64px rgba(0,0,0,0.2)" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <h2 style={{ fontSize:19, fontWeight:700, color:"#1a2d4e" }}>{title}</h2>
        <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8" }}><X size={20}/></button>
      </div>
      {children}
    </div>
  </div>
);
const Empty = ({ icon, text }) => (
  <div style={{ ...S.card, padding:60, textAlign:"center", border:"2px dashed #e2e8f0" }}>
    <div style={{ color:"#cbd5e1", marginBottom:12 }}>{icon}</div>
    <p style={{ color:"#94a3b8", fontWeight:500 }}>{text}</p>
  </div>
);
const Grid2 = ({ children }) => <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>{children}</div>;

const AddressField = ({ label, value, onChange }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const ref = useRef();
  const search = async (q) => {
    onChange(q);
    if (q.length < 3) { setSuggestions([]); return; }
    try {
      const r = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5`);
      const d = await r.json();
      setSuggestions(d.features || []);
      setShow(true);
    } catch { setSuggestions([]); }
  };
  const pick = (f) => {
    onChange(f.properties.name + ", " + f.properties.postcode + " " + f.properties.city);
    setSuggestions([]); setShow(false);
  };
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div style={{ marginBottom:14, position:"relative" }} ref={ref}>
      {label && <Label>{label}</Label>}
      <input value={value} onChange={e=>search(e.target.value)}
        style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, outline:"none", color:"#1e293b", fontFamily:"inherit", boxSizing:"border-box" }}
        onFocus={e=>{e.target.style.borderColor="#3b82f6";if(suggestions.length>0)setShow(true);}}
        onBlur={e=>e.target.style.borderColor="#e2e8f0"}
        placeholder="Commencez à taper une adresse..."
        autoComplete="off"
      />
      {show && suggestions.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:8, boxShadow:"0 8px 24px rgba(0,0,0,0.1)", zIndex:500, overflow:"hidden" }}>
          {suggestions.map((f, i) => (
            <div key={i} onMouseDown={()=>pick(f)} style={{ padding:"10px 14px", cursor:"pointer", fontSize:13, color:"#1e293b", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", gap:8 }}
              onMouseEnter={e=>e.currentTarget.style.background="#f8fafc"}
              onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
              📍 <span><strong>{f.properties.name}</strong> — {f.properties.postcode} {f.properties.city}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Spinner = () => (
  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
    <div style={{ width:32, height:32, border:"3px solid #e2e8f0", borderTop:"3px solid #1a2d4e", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ─── LOGIN ─────────────────────────────────────────────────────────────────────

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [mode, setMode] = useState("login");
  const handle = async () => {
    setLoading(true); setError("");
    const fn = mode === "login" ? supabase.auth.signInWithPassword.bind(supabase.auth) : supabase.auth.signUp.bind(supabase.auth);
    const { error: err } = await fn({ email, password });
    if (err) setError(err.message);
    else if (mode === "signup") setError("✅ Compte créé ! Vérifiez votre email puis connectez-vous.");
    else onLogin();
    setLoading(false);
  };
  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:20, padding:48, width:420, boxShadow:"0 8px 40px rgba(26,45,78,0.12)" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ background:"#1a2d4e", width:64, height:64, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}><Building2 size={30} color="#fff"/></div>
          <h1 style={{ fontSize:22, fontWeight:900, color:"#1a2d4e", letterSpacing:3 }}>PHANTOM</h1>
          <p style={{ color:"#94a3b8", fontSize:14, marginTop:4 }}>Connectez-vous à votre espace</p>
        </div>
        <Field label="Email" type="email" placeholder="vous@exemple.com" value={email} onChange={e=>setEmail(e.target.value)}/>
        <Field label="Mot de passe" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)}/>
        {error && <p style={{ color:error.startsWith("✅")?"#16a34a":"#dc2626", fontSize:13, marginBottom:12 }}>{error}</p>}
        <Btn style={{ width:"100%", justifyContent:"center", padding:14 }} onClick={handle} disabled={loading}>
          {loading ? "..." : mode === "login" ? "Se connecter" : "Créer le compte"}
        </Btn>
        <p onClick={()=>setMode(m=>m==="login"?"signup":"login")} style={{ textAlign:"center", marginTop:18, fontSize:13, color:"#3b82f6", cursor:"pointer" }}>
          {mode==="login" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
        </p>
      </div>
    </div>
  );
};

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────

const Dashboard = ({ biens, locataires, baux, transactions }) => {
  const bauxActifs = baux.filter(b=>b.actif);
  const totalEnc = transactions.filter(t=>t.statut==="payé").reduce((s,t)=>s+t.montant_loyer+t.montant_charges,0);
  const totalImp = transactions.filter(t=>t.statut==="impayé").reduce((s,t)=>s+t.montant_loyer+t.montant_charges,0);
  const tauxOcc = biens.length ? Math.round(bauxActifs.length/biens.length*100) : 0;
  const alertes = transactions.filter(t=>t.statut==="impayé");
  const tod = new Date();
  const alertesRevision = baux.filter(b => {
    if (!b.date_revision_anniversaire) return false;
    const rev = new Date(b.date_revision_anniversaire);
    const rty = new Date(tod.getFullYear(), rev.getMonth(), rev.getDate());
    if (rty < tod) rty.setFullYear(tod.getFullYear() + 1);
    return (rty - tod) / (1000*60*60*24) <= 60;
  }).map(b => {
    const rev = new Date(b.date_revision_anniversaire);
    const rty = new Date(tod.getFullYear(), rev.getMonth(), rev.getDate());
    if (rty < tod) rty.setFullYear(tod.getFullYear() + 1);
    const diff = Math.round((rty - tod) / (1000*60*60*24));
    return { ...b, diff, loc:locataires.find(l=>l.id===b.locataire_id), bien:biens.find(x=>x.id===b.bien_id) };
  });
  const kpis = [
    {l:"Biens",v:biens.length,icon:<Building2 size={18}/>,c:"#3b82f6"},
    {l:"Locataires",v:locataires.length,icon:<Users size={18}/>,c:"#8b5cf6"},
    {l:"Baux actifs",v:bauxActifs.length,icon:<FileText size={18}/>,c:"#10b981"},
    {l:"Total encaissé",v:fmt(totalEnc),icon:<Euro size={18}/>,c:"#10b981"},
    {l:"Taux d'occupation",v:tauxOcc+"%",icon:<TrendingUp size={18}/>,c:"#f59e0b"},
    {l:"Impayés",v:fmt(totalImp),icon:<AlertTriangle size={18}/>,c:"#ef4444"},
  ];
  return (
    <div>
      <h1 style={{fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2}}>Tableau de bord</h1>
      <p style={{color:"#94a3b8",marginBottom:32}}>Vue d'ensemble de votre patrimoine immobilier</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18,marginBottom:32}}>
        {kpis.map((k,i)=>(
          <div key={i} style={{...S.card,padding:24}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><p style={{fontSize:13,color:"#94a3b8",marginBottom:8,fontWeight:500}}>{k.l}</p><p style={{fontSize:26,fontWeight:800,color:"#1a2d4e"}}>{k.v}</p></div>
              <div style={{background:k.c+"18",color:k.c,padding:10,borderRadius:10}}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>
      {alertesRevision.length>0&&(
        <div style={{...S.card,padding:24,border:"1px solid #fef3c7",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}><span style={{fontSize:16}}>📅</span><h3 style={{fontSize:15,fontWeight:700,color:"#1a2d4e"}}>Révisions de loyer à venir ({alertesRevision.length})</h3></div>
          {alertesRevision.map(a=>(
            <div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #f8fafc"}}>
              <div><p style={{fontWeight:600,color:"#1a2d4e",fontSize:14}}>{a.loc?a.loc.raison_sociale||`${a.loc.prenom} ${a.loc.nom}`:"—"}</p><p style={{fontSize:12,color:"#94a3b8"}}>{a.bien?.adresse} — Indice {a.indice_revision||"ILC"}</p></div>
              <span style={{background:a.diff<=30?"#fee2e2":"#fef9c3",color:a.diff<=30?"#dc2626":"#b45309",padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>
                {a.diff===0?"Aujourd'hui":a.diff<0?`${Math.abs(a.diff)}j de retard`:`Dans ${a.diff} jours`}
              </span>
            </div>
          ))}
        </div>
      )}
      {alertes.length>0&&(
        <div style={{...S.card,padding:24,border:"1px solid #fee2e2"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}><AlertTriangle size={16} color="#ef4444"/><h3 style={{fontSize:15,fontWeight:700,color:"#1a2d4e"}}>Alertes impayés ({alertes.length})</h3></div>
          {alertes.slice(0,6).map(a=>{
            const bail=baux.find(b=>b.id===a.bail_id); const loc=bail?locataires.find(l=>l.id===bail.locataire_id):null; const bien=bail?biens.find(b=>b.id===bail.bien_id):null;
            return (<div key={a.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #f8fafc"}}>
              <div><p style={{fontWeight:600,color:"#1a2d4e",fontSize:14}}>{loc?loc.raison_sociale||`${loc.prenom} ${loc.nom}`:"—"}</p><p style={{fontSize:12,color:"#94a3b8"}}>{bien?.adresse} — {MONTHS[a.mois]} {a.annee}</p></div>
              <div style={{textAlign:"right"}}><p style={{fontWeight:700,color:"#ef4444",fontSize:15}}>{fmt(a.montant_loyer+a.montant_charges)}</p><Badge statut="impayé"/></div>
            </div>);
          })}
        </div>
      )}
    </div>
  );
};

// ─── BIENS ────────────────────────────────────────────────────────────────────

const BiensPage = ({ biens, reload }) => {
  const [open,setOpen]=useState(false);
  const [editBien,setEditBien]=useState(null);
  const [f,setF]=useState({adresse:"",ville:"",code_postal:"",surface:"",type:"Commercial",activite:"",prix_achat:"",statut_bien:"Actif",loyer_mensuel:"",taxe_fonciere:"",notes:"",reference:""});
  const statutColor = { "Actif":"#10b981", "Offre acceptée":"#f59e0b", "Vacant":"#ef4444", "En travaux":"#8b5cf6" };
  const openAdd = () => { setEditBien(null); setF({adresse:"",ville:"",code_postal:"",surface:"",type:"Commercial",activite:"",prix_achat:"",statut_bien:"Actif",loyer_mensuel:"",taxe_fonciere:"",notes:"",reference:""}); setOpen(true); };
  const openEdit = (b) => { setEditBien(b); setF({adresse:b.adresse||"",ville:b.ville||"",code_postal:b.code_postal||"",surface:b.surface||"",type:b.type||"Commercial",activite:b.activite||"",prix_achat:b.prix_achat||"",statut_bien:b.statut_bien||"Actif",loyer_mensuel:b.loyer_mensuel||"",taxe_fonciere:b.taxe_fonciere||"",notes:b.notes||"",reference:b.reference||""}); setOpen(true); };
  const save = async () => {
    const payload = {...f, surface:+f.surface, taxe_fonciere:+f.taxe_fonciere, prix_achat:+f.prix_achat, loyer_mensuel:+f.loyer_mensuel};
    if (editBien) { await supabase.from("biens").update(payload).eq("id", editBien.id); }
    else { const {data:{user}} = await supabase.auth.getUser(); await supabase.from("biens").insert({...payload, user_id:user.id}); }
    reload(); setOpen(false);
  };
  const del = async (id) => { await supabase.from("biens").delete().eq("id",id); reload(); };
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32}}>
        <div><h1 style={{fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2}}>Biens immobiliers</h1><p style={{color:"#94a3b8",fontSize:14}}>Gérez votre patrimoine</p></div>
        <Btn onClick={openAdd}><Plus size={15}/>Ajouter un bien</Btn>
      </div>
      {biens.length===0?<Empty icon={<Building2 size={40}/>} text="Aucun bien."/>
      :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:18}}>
        {biens.map(b=>(
          <div key={b.id} style={{...S.card,padding:22}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                {b.reference&&<span style={{background:"#1a2d4e",color:"#fff",fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20}}>{b.reference}</span>}
                <span style={{background:"#eff6ff",color:"#3b82f6",fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:20}}>{b.activite||b.type}</span>
                {b.statut_bien&&<span style={{background:(statutColor[b.statut_bien]||"#64748b")+"18",color:statutColor[b.statut_bien]||"#64748b",fontSize:11,fontWeight:600,padding:"2px 9px",borderRadius:20}}>{b.statut_bien}</span>}
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <button onClick={()=>openEdit(b)} title="Modifier" style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",padding:"4px 8px",fontSize:12,color:"#64748b"}}>✏️</button>
                <button onClick={()=>del(b.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#cbd5e1"}}><Trash2 size={14}/></button>
              </div>
            </div>
            <h3 style={{fontSize:15,fontWeight:700,color:"#1a2d4e",marginBottom:3}}>{b.adresse}</h3>
            <p style={{color:"#94a3b8",fontSize:13,marginBottom:14}}>{b.code_postal} {b.ville}</p>
            <div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:b.notes?12:0}}>
              <div><p style={{fontSize:11,color:"#94a3b8"}}>Surface</p><p style={{fontWeight:700,color:"#1a2d4e"}}>{b.surface} m²</p></div>
              {b.loyer_mensuel>0&&<div><p style={{fontSize:11,color:"#94a3b8"}}>Loyer/mois</p><p style={{fontWeight:700,color:"#10b981"}}>{fmt(b.loyer_mensuel)}</p></div>}
              {b.prix_achat>0&&<div><p style={{fontSize:11,color:"#94a3b8"}}>Prix achat</p><p style={{fontWeight:700,color:"#1a2d4e"}}>{new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(b.prix_achat)}</p></div>}
              <div><p style={{fontSize:11,color:"#94a3b8"}}>TF/an</p><p style={{fontWeight:700,color:"#1a2d4e"}}>{fmt(b.taxe_fonciere)}</p></div>
            </div>
            {b.notes&&<p style={{fontSize:12,color:"#94a3b8",fontStyle:"italic",marginTop:8,paddingTop:8,borderTop:"1px solid #f1f5f9"}}>{b.notes}</p>}
          </div>
        ))}
      </div>}
      {open&&<Modal title={editBien?"Modifier le bien":"Nouveau bien"} onClose={()=>setOpen(false)} width={580}>
        <Grid2>
          <Field label="Référence courte" placeholder="ex: Diderot" value={f.reference} onChange={e=>setF(p=>({...p,reference:e.target.value}))}/>
          <Sel label="Statut" value={f.statut_bien} onChange={e=>setF(p=>({...p,statut_bien:e.target.value}))} options={[{v:"Actif",l:"Actif"},{v:"Offre acceptée",l:"Offre acceptée"},{v:"Vacant",l:"Vacant"},{v:"En travaux",l:"En travaux"}]}/>
        </Grid2>
        <AddressField label="Adresse *" value={f.adresse} onChange={v=>{ const match=v.match(/,\s*(\d{5})\s+(.+)$/); if(match){setF(p=>({...p,adresse:v.split(",")[0].trim(),code_postal:match[1],ville:match[2].trim()}));}else{setF(p=>({...p,adresse:v}));} }}/>
        <Grid2><Field label="Ville" value={f.ville} onChange={e=>setF(p=>({...p,ville:e.target.value}))}/><Field label="Code postal" value={f.code_postal} onChange={e=>setF(p=>({...p,code_postal:e.target.value}))}/></Grid2>
        <Grid2>
          <Field label="Activité" placeholder="ex: Restaurant, Bureau..." value={f.activite} onChange={e=>setF(p=>({...p,activite:e.target.value}))}/>
          <Sel label="Type" value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} options={[{v:"Commercial",l:"Commercial"},{v:"Habitation",l:"Habitation"},{v:"Mixte",l:"Mixte"}]}/>
        </Grid2>
        <Grid2>
          <Field label="Surface (m²)" type="number" value={f.surface} onChange={e=>setF(p=>({...p,surface:e.target.value}))}/>
          <Field label="Loyer mensuel (€)" type="number" value={f.loyer_mensuel} onChange={e=>setF(p=>({...p,loyer_mensuel:e.target.value}))}/>
        </Grid2>
        <Grid2>
          <Field label="Prix d'achat (€)" type="number" value={f.prix_achat} onChange={e=>setF(p=>({...p,prix_achat:e.target.value}))}/>
          <Field label="Taxe foncière (€/an)" type="number" value={f.taxe_fonciere} onChange={e=>setF(p=>({...p,taxe_fonciere:e.target.value}))}/>
        </Grid2>
        <div style={{marginBottom:14}}>
          <Label>Notes</Label>
          <textarea value={f.notes} onChange={e=>setF(p=>({...p,notes:e.target.value}))} placeholder="Informations complémentaires..." style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:14,color:"#1e293b",fontFamily:"inherit",boxSizing:"border-box",resize:"vertical",minHeight:72,outline:"none"}} onFocus={e=>e.target.style.borderColor="#3b82f6"} onBlur={e=>e.target.style.borderColor="#e2e8f0"}/>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:4}}>
          <Btn v="ghost" onClick={()=>setOpen(false)}>Annuler</Btn>
          <Btn onClick={save}>{editBien?"Enregistrer les modifications":"Ajouter"}</Btn>
        </div>
      </Modal>}
    </div>
  );
};

// ─── LOCATAIRES ───────────────────────────────────────────────────────────────

const LocatairesPage = ({ locataires, reload }) => {
  const [open,setOpen]=useState(false);
  const [f,setF]=useState({raison_sociale:"",prenom:"",nom:"",email:"",telephone:"",adresse:"",code_postal:"",ville:""});
  const add=async()=>{ const {data:{user}}=await supabase.auth.getUser(); await supabase.from("locataires").insert({...f,user_id:user.id}); reload(); setOpen(false); setF({raison_sociale:"",prenom:"",nom:"",email:"",telephone:"",adresse:"",code_postal:"",ville:""}); };
  const del=async(id)=>{ await supabase.from("locataires").delete().eq("id",id); reload(); };
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32}}>
        <div><h1 style={{fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2}}>Locataires</h1><p style={{color:"#94a3b8",fontSize:14}}>Gérez vos locataires</p></div>
        <Btn onClick={()=>setOpen(true)}><Plus size={15}/>Ajouter un locataire</Btn>
      </div>
      {locataires.length===0?<Empty icon={<Users size={40}/>} text="Aucun locataire."/>
      :<div style={{...S.card,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Locataire","Email","Téléphone",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{locataires.map(l=>(
            <tr key={l.id}>
              <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:36,height:36,borderRadius:10,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#3b82f6",fontSize:13}}>
                  {l.raison_sociale ? l.raison_sociale.slice(0,2).toUpperCase() : `${l.prenom?.[0]||""}${l.nom?.[0]||""}`}
                </div>
                <div>
                  <span style={{fontWeight:600,color:"#1a2d4e",display:"block"}}>{l.raison_sociale||`${l.prenom} ${l.nom}`}</span>
                  {l.raison_sociale&&<span style={{fontSize:12,color:"#94a3b8"}}>{l.prenom} {l.nom}</span>}
                </div>
              </div></td>
              <td style={{...S.td,color:"#64748b"}}>{l.email}</td>
              <td style={{...S.td,color:"#64748b"}}>{l.telephone}</td>
              <td style={S.td}><button onClick={()=>del(l.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#cbd5e1"}}><Trash2 size={14}/></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
      {open&&<Modal title="Nouveau locataire" onClose={()=>setOpen(false)}>
        <Field label="Raison sociale (société)" value={f.raison_sociale} onChange={e=>setF(p=>({...p,raison_sociale:e.target.value}))}/>
        <Grid2><Field label="Prénom (gérant)" value={f.prenom} onChange={e=>setF(p=>({...p,prenom:e.target.value}))}/><Field label="Nom" value={f.nom} onChange={e=>setF(p=>({...p,nom:e.target.value}))}/></Grid2>
        <Field label="Email" type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))}/>
        <Field label="Téléphone" value={f.telephone} onChange={e=>setF(p=>({...p,telephone:e.target.value}))}/>
        <AddressField label="Adresse siège" value={f.adresse} onChange={v=>{ const match=v.match(/,\s*(\d{5})\s+(.+)$/); if(match){setF(p=>({...p,adresse:v.split(",")[0].trim(),code_postal:match[1],ville:match[2].trim()}));}else{setF(p=>({...p,adresse:v}));} }}/>
        <Grid2><Field label="Code postal" value={f.code_postal} onChange={e=>setF(p=>({...p,code_postal:e.target.value}))}/><Field label="Ville" value={f.ville} onChange={e=>setF(p=>({...p,ville:e.target.value}))}/></Grid2>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:4}}><Btn v="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Ajouter</Btn></div>
      </Modal>}
    </div>
  );
};

// ─── BAUX ─────────────────────────────────────────────────────────────────────

const BauxPage = ({ baux, biens, locataires, societe, transactions, reload }) => {
  const [open,setOpen]=useState(false);
  const [editBail,setEditBail]=useState(null);
  const [docModal,setDocModal]=useState(null);
  const empty = {bien_id:"",locataire_id:"",date_debut:"",date_fin:"",loyer_ht:"",charges:"",depot:"",garantie_gapd:false,type_bail:"Bail commercial",utilisation:"",indice_revision:"ILC",date_revision_anniversaire:"",date_versement_depot:"",loyer_an1:"",loyer_an2:"",franchise_mois:"",caution_solidaire:""};
  const [f,setF]=useState(empty);
  const openAdd = () => { setEditBail(null); setF(empty); setOpen(true); };
  const openEdit = (b) => { setEditBail(b); setF({bien_id:b.bien_id||"",locataire_id:b.locataire_id||"",date_debut:b.date_debut||"",date_fin:b.date_fin||"",loyer_ht:b.loyer_ht||"",charges:b.charges||"",depot:b.depot||"",garantie_gapd:b.garantie_gapd||false,type_bail:b.type_bail||"Bail commercial",utilisation:b.utilisation||"",indice_revision:b.indice_revision||"ILC",date_revision_anniversaire:b.date_revision_anniversaire||"",date_versement_depot:b.date_versement_depot||"",loyer_an1:b.loyer_an1||"",loyer_an2:b.loyer_an2||"",franchise_mois:b.franchise_mois||"",caution_solidaire:b.caution_solidaire||""}); setOpen(true); };
  const save = async () => {
    const payload = {...f,loyer_ht:+f.loyer_ht,charges:+f.charges,depot:+f.depot,loyer_an1:f.loyer_an1?+f.loyer_an1:null,loyer_an2:f.loyer_an2?+f.loyer_an2:null,franchise_mois:f.franchise_mois?+f.franchise_mois:0,actif:true};
    if (editBail) { await supabase.from("baux").update(payload).eq("id", editBail.id); }
    else {
      const {data:{user}} = await supabase.auth.getUser();
      const {data:bail} = await supabase.from("baux").insert({...payload,user_id:user.id}).select().single();
      if(bail){ const d=new Date(); const loyerInitial=getLoyerActuel(bail); await supabase.from("transactions").insert({bail_id:bail.id,mois:d.getMonth(),annee:d.getFullYear(),montant_loyer:loyerInitial,montant_charges:bail.charges,statut:"en_attente",relance_count:0,user_id:user.id}); }
    }
    reload(); setOpen(false);
  };
  const del = async (id) => { await supabase.from("baux").delete().eq("id",id); reload(); };
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32}}>
        <div><h1 style={{fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2}}>Baux</h1><p style={{color:"#94a3b8",fontSize:14}}>Gérez vos contrats de location</p></div>
        <Btn onClick={openAdd}><Plus size={15}/>Nouveau bail</Btn>
      </div>
      {baux.length===0?<Empty icon={<FileText size={40}/>} text="Aucun bail."/>
      :<div style={{display:"flex",flexDirection:"column",gap:14}}>
        {baux.map(b=>{
          const bien=biens.find(x=>x.id===b.bien_id); const loc=locataires.find(x=>x.id===b.locataire_id);
          const nimp=transactions.filter(t=>t.bail_id===b.id&&t.statut==="impayé").length;
          const loyerActuel=getLoyerActuel(b); const anneeLabel=getAnneeLabel(b);
          const hasProgressif=b.loyer_an1||b.loyer_an2;
          let revisionAlert=null;
          if(b.date_revision_anniversaire){const tod=new Date();const rev=new Date(b.date_revision_anniversaire);const rty=new Date(tod.getFullYear(),rev.getMonth(),rev.getDate());if(rty<tod)rty.setFullYear(tod.getFullYear()+1);const diff=Math.round((rty-tod)/(1000*60*60*24));if(diff<=60)revisionAlert=diff;}
          return (
            <div key={b.id} style={{...S.card,padding:22,border:nimp>0?"1px solid #fecaca":"1px solid #f1f5f9"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <h3 style={{fontSize:15,fontWeight:700,color:"#1a2d4e"}}>{loc?loc.raison_sociale||`${loc.prenom} ${loc.nom}`:"—"}</h3>
                    {b.type_bail&&<span style={{background:"#f1f5f9",color:"#64748b",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>{b.type_bail}</span>}
                    {nimp>0&&<span style={{background:"#fee2e2",color:"#dc2626",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{nimp} impayé{nimp>1?"s":""}</span>}
                    {b.garantie_gapd&&<span style={{background:"#f0fdf4",color:"#16a34a",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>GAPD</span>}
                    {b.franchise_mois>0&&<span style={{background:"#f0f9ff",color:"#0369a1",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>Franchise {b.franchise_mois} mois</span>}
                    {revisionAlert!==null&&<span style={{background:revisionAlert<=30?"#fee2e2":"#fef9c3",color:revisionAlert<=30?"#dc2626":"#b45309",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20}}>📅 Révision {revisionAlert===0?"aujourd'hui":`dans ${revisionAlert}j`}</span>}
                  </div>
                  {b.utilisation&&<p style={{fontSize:12,color:"#8b5cf6",fontWeight:500,marginBottom:4}}>🏷️ {b.utilisation}</p>}
                  {b.caution_solidaire&&<p style={{fontSize:12,color:"#64748b",marginBottom:4}}>🛡️ Caution : {b.caution_solidaire}</p>}
                  <p style={{fontSize:13,color:"#64748b",marginBottom:12}}>{bien?.adresse} — {bien?.ville}</p>
                  <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:hasProgressif?12:0}}>
                    <div><p style={{fontSize:11,color:"#94a3b8"}}>Loyer HC {hasProgressif?`(${anneeLabel})`:""}</p><p style={{fontWeight:700,color:"#1a2d4e",fontSize:14}}>{fmt(loyerActuel)}</p></div>
                    <div><p style={{fontSize:11,color:"#94a3b8"}}>Charges</p><p style={{fontWeight:700,color:"#1a2d4e",fontSize:14}}>{fmt(b.charges)}</p></div>
                    <div><p style={{fontSize:11,color:"#94a3b8"}}>Total CC</p><p style={{fontWeight:700,color:"#1a2d4e",fontSize:14}}>{fmt(loyerActuel+b.charges)}</p></div>
                    <div><p style={{fontSize:11,color:"#94a3b8"}}>Dépôt</p><p style={{fontWeight:700,color:"#1a2d4e",fontSize:14}}>{fmt(b.depot)}</p></div>
                    <div><p style={{fontSize:11,color:"#94a3b8"}}>Période</p><p style={{fontWeight:600,color:"#1a2d4e",fontSize:13}}>{b.date_debut} → {b.date_fin||"∞"}</p></div>
                    {b.indice_revision&&b.indice_revision!=="Aucun"&&<div><p style={{fontSize:11,color:"#94a3b8"}}>Indice</p><p style={{fontWeight:600,color:"#1a2d4e",fontSize:13}}>{b.indice_revision}</p></div>}
                    {b.date_versement_depot&&<div><p style={{fontSize:11,color:"#94a3b8"}}>DG versé</p><p style={{fontWeight:600,color:"#1a2d4e",fontSize:13}}>{new Date(b.date_versement_depot).toLocaleDateString("fr-FR")}</p></div>}
                  </div>
                  {hasProgressif&&(
                    <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",display:"flex",gap:16,flexWrap:"wrap"}}>
                      <p style={{fontSize:11,color:"#94a3b8",fontWeight:600,width:"100%",marginBottom:4}}>📈 LOYER PROGRESSIF</p>
                      {b.loyer_an1&&<div><p style={{fontSize:11,color:"#94a3b8"}}>An 1</p><p style={{fontWeight:700,color:anneeLabel==="Année 1"?"#3b82f6":"#1a2d4e",fontSize:13}}>{fmt(b.loyer_an1)}</p></div>}
                      {b.loyer_an2&&<div><p style={{fontSize:11,color:"#94a3b8"}}>An 2</p><p style={{fontWeight:700,color:anneeLabel==="Année 2"?"#3b82f6":"#1a2d4e",fontSize:13}}>{fmt(b.loyer_an2)}</p></div>}
                      <div><p style={{fontSize:11,color:"#94a3b8"}}>An 3+</p><p style={{fontWeight:700,color:anneeLabel==="Année 3+"?"#3b82f6":"#1a2d4e",fontSize:13}}>{fmt(b.loyer_ht)}</p></div>
                    </div>
                  )}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end",marginLeft:16}}>
                  <Btn v="ghost" onClick={()=>setDocModal({bail:b,bien,loc})} style={{fontSize:12,padding:"6px 12px"}}><Printer size={13}/>Documents</Btn>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>openEdit(b)} title="Modifier" style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:6,cursor:"pointer",padding:"4px 8px",fontSize:12,color:"#64748b"}}>✏️</button>
                    <button onClick={()=>del(b.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#cbd5e1"}}><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>}
      {open&&<Modal title={editBail?"Modifier le bail":"Nouveau bail"} onClose={()=>setOpen(false)} width={600}>
        <Grid2>
          <Sel label="Type de bail *" value={f.type_bail} onChange={e=>setF(p=>({...p,type_bail:e.target.value}))} options={[{v:"Bail commercial",l:"Bail commercial (3-6-9)"},{v:"Bail professionnel",l:"Bail professionnel"},{v:"Bail habitation",l:"Bail habitation"},{v:"Bail précaire",l:"Bail précaire / dérogatoire"},{v:"Autre",l:"Autre"}]}/>
          <Field label="Utilisation / Activité" placeholder="ex: Traiteur Arménien" value={f.utilisation} onChange={e=>setF(p=>({...p,utilisation:e.target.value}))}/>
        </Grid2>
        <Sel label="Bien *" value={f.bien_id} onChange={e=>setF(p=>({...p,bien_id:e.target.value}))} options={[{v:"",l:"Sélectionner un bien"},...biens.map(b=>({v:b.id,l:`${b.reference?b.reference+" — ":""}${b.adresse} — ${b.ville}`}))]}/>
        <Sel label="Locataire *" value={f.locataire_id} onChange={e=>setF(p=>({...p,locataire_id:e.target.value}))} options={[{v:"",l:"Sélectionner un locataire"},...locataires.map(l=>({v:l.id,l:l.raison_sociale||`${l.prenom} ${l.nom}`}))]}/>
        <Grid2>
          <Field label="Date début *" type="date" value={f.date_debut} onChange={e=>setF(p=>({...p,date_debut:e.target.value}))}/>
          <Field label="Date fin" type="date" value={f.date_fin} onChange={e=>setF(p=>({...p,date_fin:e.target.value}))}/>
        </Grid2>
        <div style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",marginBottom:14}}>
          <p style={{fontSize:11,fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:12}}>📈 Loyer progressif</p>
          <Grid2>
            <Field label="Loyer An 1 (€ HT/mois)" type="number" placeholder="Vide si pas de progressif" value={f.loyer_an1} onChange={e=>setF(p=>({...p,loyer_an1:e.target.value}))}/>
            <Field label="Loyer An 2 (€ HT/mois)" type="number" placeholder="Vide si pas de progressif" value={f.loyer_an2} onChange={e=>setF(p=>({...p,loyer_an2:e.target.value}))}/>
          </Grid2>
          <Field label="Loyer An 3+ / Loyer normal (€ HT/mois) *" type="number" value={f.loyer_ht} onChange={e=>setF(p=>({...p,loyer_ht:e.target.value}))}/>
        </div>
        <Grid2>
          <Field label="Charges (€/mois)" type="number" value={f.charges} onChange={e=>setF(p=>({...p,charges:e.target.value}))}/>
          <Field label="Franchise (mois)" type="number" placeholder="ex: 3" value={f.franchise_mois} onChange={e=>setF(p=>({...p,franchise_mois:e.target.value}))}/>
        </Grid2>
        <Grid2>
          <Field label="Dépôt de garantie (€)" type="number" value={f.depot} onChange={e=>setF(p=>({...p,depot:e.target.value}))}/>
          <Field label="Date versement dépôt" type="date" value={f.date_versement_depot} onChange={e=>setF(p=>({...p,date_versement_depot:e.target.value}))}/>
        </Grid2>
        <Field label="Caution solidaire" placeholder="ex: Gérant DAVTIAN Aren / Société MAGESH" value={f.caution_solidaire} onChange={e=>setF(p=>({...p,caution_solidaire:e.target.value}))}/>
        <Grid2>
          <Sel label="Indice de révision" value={f.indice_revision} onChange={e=>setF(p=>({...p,indice_revision:e.target.value}))} options={[{v:"ILC",l:"ILC (Commercial)"},{v:"IRL",l:"IRL (Habitation)"},{v:"ILAT",l:"ILAT (Tertiaire)"},{v:"Aucun",l:"Pas de révision"}]}/>
          <Field label="Date anniversaire révision" type="date" value={f.date_revision_anniversaire} onChange={e=>setF(p=>({...p,date_revision_anniversaire:e.target.value}))}/>
        </Grid2>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"#1a2d4e",marginBottom:16}}>
          <input type="checkbox" checked={f.garantie_gapd} onChange={e=>setF(p=>({...p,garantie_gapd:e.target.checked}))}/> Garantie GAPD
        </label>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn v="ghost" onClick={()=>setOpen(false)}>Annuler</Btn>
          <Btn onClick={save}>{editBail?"Enregistrer les modifications":"Créer le bail"}</Btn>
        </div>
      </Modal>}
      {docModal&&<Modal title="Générer un document" onClose={()=>setDocModal(null)} width={500}>
        <p style={{color:"#64748b",marginBottom:20,fontSize:14}}>{docModal.loc?.raison_sociale||`${docModal.loc?.prenom} ${docModal.loc?.nom}`} — {docModal.bien?.adresse}</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#f8fafc",borderRadius:10,padding:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><p style={{fontWeight:600,color:"#1a2d4e",marginBottom:2}}>Avis d'échéance</p><p style={{fontSize:12,color:"#94a3b8"}}>{MONTHS[now.getMonth()]} {now.getFullYear()}</p></div>
            <Btn onClick={()=>{pdfAvisEcheance(docModal.bail,docModal.bien,docModal.loc,societe,now.getMonth(),now.getFullYear());setDocModal(null);}}><Printer size={13}/>PDF</Btn>
          </div>
          <div style={{background:"#f0fdf4",borderRadius:10,padding:16,display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #bbf7d0"}}>
            <div><p style={{fontWeight:600,color:"#1a2d4e",marginBottom:2}}>Facture loyer (TVA 20%)</p><p style={{fontSize:12,color:"#94a3b8"}}>{MONTHS[now.getMonth()]} {now.getFullYear()}</p></div>
            <Btn v="green" onClick={()=>{pdfFacture(docModal.bail,docModal.bien,docModal.loc,societe,now.getMonth(),now.getFullYear());setDocModal(null);}}><Printer size={13}/>PDF</Btn>
          </div>
          {transactions.filter(t=>t.bail_id===docModal.bail?.id&&t.statut==="impayé").length>0&&(<>
            <div style={{background:"#fff7ed",borderRadius:10,padding:16,display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #fed7aa"}}>
              <div><p style={{fontWeight:600,color:"#c2410c",marginBottom:2}}>Relance amiable</p><p style={{fontSize:12,color:"#94a3b8"}}>{transactions.filter(t=>t.bail_id===docModal.bail?.id&&t.statut==="impayé").length} impayé(s)</p></div>
              <Btn v="ghost" onClick={()=>{pdfRelanceAmiable(docModal.bail,docModal.bien,docModal.loc,societe,transactions);setDocModal(null);}} style={{color:"#c2410c",borderColor:"#fed7aa"}}><Printer size={13}/>PDF</Btn>
            </div>
            <div style={{background:"#fef3c7",borderRadius:10,padding:16,display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #fde68a"}}>
              <div><p style={{fontWeight:600,color:"#92400e",marginBottom:2}}>Mise en demeure</p><p style={{fontSize:12,color:"#94a3b8"}}>Avant commandement de payer</p></div>
              <Btn v="ghost" onClick={()=>{pdfMiseEnDemeure(docModal.bail,docModal.bien,docModal.loc,societe,transactions);setDocModal(null);}} style={{color:"#92400e",borderColor:"#fde68a"}}><Printer size={13}/>PDF</Btn>
            </div>
            <div style={{background:"#fff5f5",borderRadius:10,padding:16,display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #fee2e2"}}>
              <div><p style={{fontWeight:600,color:"#dc2626",marginBottom:2}}>Commandement de payer</p><p style={{fontSize:12,color:"#94a3b8"}}>Acte juridique formel</p></div>
              <Btn v="danger" onClick={()=>{pdfCommandement(docModal.bail,docModal.bien,docModal.loc,societe,transactions);setDocModal(null);}}><Printer size={13}/>PDF</Btn>
            </div>
          </>)}
        </div>
      </Modal>}
    </div>
  );
};

// ─── FINANCES / ÉCHEANCIER ────────────────────────────────────────────────────

const FinancesPage = ({ baux, biens, locataires, transactions, societe, reload }) => {
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [docModal, setDocModal] = useState(null);

  const years = [];
  for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 1; y++) years.push(y);

  const bauxActifs = baux.filter(b => b.actif);

  const getStatutMois = (bailId, mois, annee) => {
    return transactions.find(t => t.bail_id === bailId && t.mois === mois && t.annee === annee);
  };

  const totalAttendu = bauxActifs.reduce((sum, b) => {
    let total = 0;
    for (let m = 0; m < 12; m++) {
      const loyer = getLoyerPourMois(b, m, selectedYear);
      total += loyer + b.charges;
    }
    return sum + total;
  }, 0);

  const totalEncaisse = transactions.filter(t => {
    const bail = baux.find(b => b.id === t.bail_id);
    return bail && t.statut === "payé" && t.annee === selectedYear;
  }).reduce((s,t) => s + t.montant_loyer + t.montant_charges, 0);

  const totalImpaye = transactions.filter(t => {
    const bail = baux.find(b => b.id === t.bail_id);
    return bail && t.statut === "impayé" && t.annee === selectedYear;
  }).reduce((s,t) => s + t.montant_loyer + t.montant_charges, 0);

  const markPaid = async (transId) => {
    await supabase.from("transactions").update({statut:"payé", date_paiement:today()}).eq("id", transId);
    reload();
  };

  const createAndMarkPaid = async (bail, mois, annee) => {
    const {data:{user}} = await supabase.auth.getUser();
    const loyer = getLoyerPourMois(bail, mois, annee);
    await supabase.from("transactions").insert({
      bail_id:bail.id, mois, annee,
      montant_loyer:loyer, montant_charges:bail.charges,
      statut:"payé", date_paiement:today(), relance_count:0, user_id:user.id
    });
    reload();
  };

  const createPending = async (bail, mois, annee) => {
    const {data:{user}} = await supabase.auth.getUser();
    const loyer = getLoyerPourMois(bail, mois, annee);
    await supabase.from("transactions").insert({
      bail_id:bail.id, mois, annee,
      montant_loyer:loyer, montant_charges:bail.charges,
      statut:"en_attente", relance_count:0, user_id:user.id
    });
    reload();
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32}}>
        <div><h1 style={{fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2}}>Finances</h1><p style={{color:"#94a3b8",fontSize:14}}>Échéancier et suivi des paiements</p></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {years.map(y => <button key={y} onClick={()=>setSelectedYear(y)} style={{padding:"7px 16px",borderRadius:8,border:selectedYear===y?"none":"1.5px solid #e2e8f0",background:selectedYear===y?"#1a2d4e":"#fff",color:selectedYear===y?"#fff":"#64748b",fontWeight:600,cursor:"pointer",fontSize:13}}>{y}</button>)}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:32}}>
        {[
          {l:"Attendu "+selectedYear, v:fmt(totalAttendu), c:"#3b82f6", sub:"Total loyers + charges"},
          {l:"Encaissé", v:fmt(totalEncaisse), c:"#10b981", sub:`${Math.round(totalAttendu>0?totalEncaisse/totalAttendu*100:0)}% du total attendu`},
          {l:"Impayés", v:fmt(totalImpaye), c:"#ef4444", sub:"À recouvrer"},
        ].map((k,i)=>(
          <div key={i} style={{...S.card,padding:22}}>
            <p style={{fontSize:12,color:"#94a3b8",marginBottom:4,fontWeight:500}}>{k.l}</p>
            <p style={{fontSize:24,fontWeight:800,color:k.c,marginBottom:4}}>{k.v}</p>
            <p style={{fontSize:11,color:"#94a3b8"}}>{k.sub}</p>
          </div>
        ))}
      </div>

      {bauxActifs.length === 0 ? <Empty icon={<Calendar size={40}/>} text="Aucun bail actif."/> :
      <div style={{...S.card, overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
          <thead>
            <tr>
              <th style={{...S.th, position:"sticky", left:0, background:"#f8fafc", zIndex:2, minWidth:160}}>Locataire / Bien</th>
              {MONTHS_SHORT.map((m,i) => <th key={i} style={{...S.th, textAlign:"center", padding:"11px 8px", minWidth:72, background:i===now.getMonth()&&selectedYear===now.getFullYear()?"#eff6ff":"#f8fafc"}}>{m}</th>)}
              <th style={{...S.th, textAlign:"right"}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {bauxActifs.map(b => {
              const loc = locataires.find(l=>l.id===b.locataire_id);
              const bien = biens.find(x=>x.id===b.bien_id);
              const debutBail = b.date_debut ? new Date(b.date_debut) : null;
              const finBail = b.date_fin ? new Date(b.date_fin) : null;
              let totalAnnee = 0;
              return (
                <tr key={b.id}>
                  <td style={{...S.td, position:"sticky", left:0, background:"#fff", zIndex:1, borderRight:"1px solid #f1f5f9"}}>
                    <p style={{fontWeight:600,color:"#1a2d4e",fontSize:13}}>{loc?loc.raison_sociale||`${loc.prenom} ${loc.nom}`:"—"}</p>
                    <p style={{fontSize:11,color:"#94a3b8"}}>{bien?.reference||bien?.adresse?.slice(0,18)}</p>
                  </td>
                  {MONTHS_SHORT.map((m,mois) => {
                    const loyer = getLoyerPourMois(b, mois, selectedYear);
                    const montantMois = loyer + b.charges;
                    totalAnnee += montantMois;
                    const tx = getStatutMois(b.id, mois, selectedYear);
                    const isBeforeBail = debutBail && new Date(selectedYear, mois, 1) < new Date(debutBail.getFullYear(), debutBail.getMonth(), 1);
                    const isAfterBail = finBail && new Date(selectedYear, mois, 1) > finBail;
                    const isFuture = new Date(selectedYear, mois, 1) > new Date(now.getFullYear(), now.getMonth(), 1);
                    const isCurrent = mois === now.getMonth() && selectedYear === now.getFullYear();

                    if (isBeforeBail || isAfterBail) {
                      return <td key={mois} style={{...S.td, textAlign:"center", background:"#f8fafc"}}><span style={{color:"#e2e8f0"}}>—</span></td>;
                    }

                    const statut = tx?.statut;
                    let bg = "#fff"; let color = "#1a2d4e"; let label = fmt(montantMois).replace("€","").trim();

                    if (statut === "payé") { bg="#f0fdf4"; color="#16a34a"; }
                    else if (statut === "impayé") { bg="#fff5f5"; color="#dc2626"; }
                    else if (statut === "en_attente") { bg="#fefce8"; color="#b45309"; }
                    else if (isFuture) { bg="#f8fafc"; color="#94a3b8"; }
                    else { bg="#fff5f5"; color="#dc2626"; }

                    return (
                      <td key={mois} style={{...S.td, textAlign:"center", padding:"8px 4px", background:isCurrent?"#eff6ff":bg, border:isCurrent?"1px solid #bfdbfe":undefined}}>
                        <div style={{fontSize:11,fontWeight:600,color,marginBottom:3}}>{label}</div>
                        {tx ? (
                          <div style={{display:"flex",justifyContent:"center",gap:3}}>
                            {statut==="payé" ? <span style={{fontSize:9,color:"#16a34a"}}>✓ {tx.date_paiement?new Date(tx.date_paiement).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}):"payé"}</span>
                            : statut==="impayé" ? <button onClick={()=>markPaid(tx.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:9,color:"#dc2626"}}>Marquer payé</button>
                            : <button onClick={()=>markPaid(tx.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:9,color:"#b45309"}}>→ payé</button>}
                          </div>
                        ) : !isFuture ? (
                          <button onClick={()=>createAndMarkPaid(b, mois, selectedYear)} style={{background:"none",border:"none",cursor:"pointer",fontSize:9,color:"#dc2626",display:"block",width:"100%",textAlign:"center"}}>+ Enregistrer</button>
                        ) : (
                          <button onClick={()=>createPending(b, mois, selectedYear)} style={{background:"none",border:"none",cursor:"pointer",fontSize:9,color:"#94a3b8"}}>+ Prévoir</button>
                        )}
                      </td>
                    );
                  })}
                  <td style={{...S.td, textAlign:"right", fontWeight:700, color:"#1a2d4e", whiteSpace:"nowrap"}}>{fmt(totalAnnee)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{background:"#f8fafc"}}>
              <td style={{...S.td, fontWeight:700, color:"#1a2d4e", fontSize:12, position:"sticky", left:0, background:"#f8fafc"}}>TOTAL MENSUEL</td>
              {MONTHS_SHORT.map((_,mois) => {
                const totalMois = bauxActifs.reduce((s,b) => s + getLoyerPourMois(b,mois,selectedYear) + b.charges, 0);
                const encaisseMois = transactions.filter(t => baux.find(b=>b.id===t.bail_id) && t.mois===mois && t.annee===selectedYear && t.statut==="payé").reduce((s,t) => s+t.montant_loyer+t.montant_charges, 0);
                return <td key={mois} style={{...S.td, textAlign:"center", padding:"8px 4px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#1a2d4e"}}>{fmt(totalMois).replace("€","").trim()}</div>
                  <div style={{fontSize:9,color:encaisseMois>=totalMois?"#16a34a":"#94a3b8"}}>✓{fmt(encaisseMois).replace("€","").trim()}</div>
                </td>;
              })}
              <td style={{...S.td, textAlign:"right", fontWeight:700, color:"#1a2d4e"}}>{fmt(totalAttendu)}</td>
            </tr>
          </tfoot>
        </table>
      </div>}
    </div>
  );
};

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

const TransactionsPage = ({ transactions, baux, biens, locataires, societe, reload }) => {
  const markPaid=async(id)=>{ await supabase.from("transactions").update({statut:"payé",date_paiement:today()}).eq("id",id); reload(); };
  const relancer=async(id,count)=>{ await supabase.from("transactions").update({relance_count:count+1}).eq("id",id); reload(); };
  const rows=transactions.map(t=>{ const bail=baux.find(b=>b.id===t.bail_id); return {...t,loc:bail?locataires.find(l=>l.id===bail.locataire_id):null,bien:bail?biens.find(b=>b.id===bail.bien_id):null,bail}; }).sort((a,b)=>b.annee-a.annee||b.mois-a.mois);
  return (
    <div>
      <h1 style={{fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2}}>Transactions</h1>
      <p style={{color:"#94a3b8",marginBottom:32}}>Historique des paiements</p>
      {rows.length===0?<Empty icon={<CreditCard size={40}/>} text="Aucune transaction."/>
      :<div style={{...S.card,overflow:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Période","Locataire","Bien","Montant HT","Montant TTC","Statut","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(t=>(
            <tr key={t.id}>
              <td style={{...S.td,fontWeight:600,color:"#1a2d4e"}}>{MONTHS[t.mois]} {t.annee}</td>
              <td style={S.td}>{t.loc?t.loc.raison_sociale||`${t.loc.prenom} ${t.loc.nom}`:"—"}</td>
              <td style={{...S.td,color:"#64748b",fontSize:13}}>{t.bien?.reference||t.bien?.adresse?.slice(0,18)||"—"}</td>
              <td style={{...S.td,fontWeight:700}}>{fmt(t.montant_loyer+t.montant_charges)}</td>
              <td style={{...S.td,color:"#64748b"}}>{fmt((t.montant_loyer+t.montant_charges)*1.2)}</td>
              <td style={S.td}><Badge statut={t.statut}/></td>
              <td style={S.td}><div style={{display:"flex",gap:6}}>
                {t.statut!=="payé"&&<button onClick={()=>markPaid(t.id)} style={{background:"#f0fdf4",color:"#16a34a",border:"none",borderRadius:6,padding:"5px 10px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><CheckCircle size={12}/>Payé</button>}
                {t.statut==="impayé"&&<button onClick={()=>relancer(t.id,t.relance_count)} style={{background:"#fff7ed",color:"#c2410c",border:"none",borderRadius:6,padding:"5px 10px",fontSize:12,fontWeight:600,cursor:"pointer"}}>↺ Relance{t.relance_count>0?` (${t.relance_count})`:""}</button>}
                {t.statut==="payé"&&t.bail&&t.bien&&t.loc&&<button onClick={()=>pdfQuittance(t.bail,t.bien,t.loc,societe,t)} style={{background:"#eff6ff",color:"#1d4ed8",border:"none",borderRadius:6,padding:"5px 10px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><Printer size={12}/>Quittance</button>}
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>}
    </div>
  );
};

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────

const DocumentsPage = ({ biens, documents, reload }) => {
  const [filterBien, setFilterBien] = useState("");
  const [filterType, setFilterType] = useState("");
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ bien_id:"", type:"bail", nom:"" });
  const [file, setFile] = useState(null);
  const fileRef = useRef();
  const [drag, setDrag] = useState(false);
  const filtered = documents.filter(d => (!filterBien || d.bien_id === filterBien) && (!filterType || d.type === filterType));
  const handleUpload = async () => {
    if (!file || !f.bien_id || !f.nom) return;
    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${f.bien_id}/${f.type}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file);
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from("documents").getPublicUrl(path);
      await supabase.from("documents").insert({ bien_id: f.bien_id, type: f.type, nom: f.nom, fichier_url: publicUrl, taille: file.size, user_id: user.id });
      reload(); setOpen(false); setF({ bien_id:"", type:"bail", nom:"" }); setFile(null);
    }
    setUploading(false);
  };
  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) { setFile(dropped); if (!f.nom) setF(p=>({...p, nom: dropped.name.replace(/\.[^/.]+$/, "")})); }
  };
  const del = async (doc) => {
    const urlParts = doc.fichier_url.split("/object/public/documents/");
    if (urlParts[1]) await supabase.storage.from("documents").remove([urlParts[1]]);
    await supabase.from("documents").delete().eq("id", doc.id);
    reload();
  };
  const typeInfo = (type) => DOC_TYPES.find(t => t.v === type) || { l: type, color: "#64748b" };
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:32}}>
        <div><h1 style={{fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2}}>Coffre-fort</h1><p style={{color:"#94a3b8",fontSize:14}}>Baux, factures et documents juridiques</p></div>
        <Btn onClick={()=>setOpen(true)}><Upload size={15}/>Ajouter un document</Btn>
      </div>
      <div style={{display:"flex",gap:12,marginBottom:24}}>
        <select value={filterBien} onChange={e=>setFilterBien(e.target.value)} style={{padding:"8px 14px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,color:"#1e293b",background:"#fff",fontFamily:"inherit",cursor:"pointer"}}>
          <option value="">Tous les biens</option>
          {biens.map(b=><option key={b.id} value={b.id}>{b.reference||b.adresse}</option>)}
        </select>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{padding:"8px 14px",border:"1.5px solid #e2e8f0",borderRadius:8,fontSize:13,color:"#1e293b",background:"#fff",fontFamily:"inherit",cursor:"pointer"}}>
          <option value="">Tous les types</option>
          {DOC_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
        {(filterBien||filterType)&&<button onClick={()=>{setFilterBien("");setFilterType("");}} style={{background:"none",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"8px 14px",fontSize:13,color:"#94a3b8",cursor:"pointer"}}>✕ Effacer</button>}
      </div>
      {filtered.length===0?<Empty icon={<FolderOpen size={40}/>} text="Aucun document."/>
      :<div style={{...S.card,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Document","Bien","Type","Taille","Date",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>{filtered.map(d=>{
            const bien=biens.find(b=>b.id===d.bien_id); const ti=typeInfo(d.type);
            return (<tr key={d.id}>
              <td style={S.td}><div style={{display:"flex",alignItems:"center",gap:10}}><div style={{background:"#f1f5f9",borderRadius:8,padding:8}}><File size={16} color="#64748b"/></div><span style={{fontWeight:600,color:"#1a2d4e"}}>{d.nom}</span></div></td>
              <td style={{...S.td,color:"#64748b",fontSize:13}}>{bien?.reference||bien?.adresse?.slice(0,22)||"—"}</td>
              <td style={S.td}><span style={{background:ti.color+"18",color:ti.color,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:600}}>{ti.l}</span></td>
              <td style={{...S.td,color:"#94a3b8",fontSize:12}}>{fmtSize(d.taille)}</td>
              <td style={{...S.td,color:"#94a3b8",fontSize:12}}>{new Date(d.created_at).toLocaleDateString("fr-FR")}</td>
              <td style={S.td}><div style={{display:"flex",gap:6}}>
                <a href={d.fichier_url} target="_blank" rel="noreferrer" style={{background:"#eff6ff",color:"#1d4ed8",border:"none",borderRadius:6,padding:"5px 10px",fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:4,textDecoration:"none"}}><Download size={12}/>Ouvrir</a>
                <button onClick={()=>del(d)} style={{background:"none",border:"none",cursor:"pointer",color:"#cbd5e1"}}><Trash2 size={14}/></button>
              </div></td>
            </tr>);
          })}</tbody>
        </table>
      </div>}
      {open&&<Modal title="Ajouter un document" onClose={()=>{setOpen(false);setFile(null);}} width={540}>
        <Sel label="Bien *" value={f.bien_id} onChange={e=>setF(p=>({...p,bien_id:e.target.value}))} options={[{v:"",l:"Sélectionner un bien"},...biens.map(b=>({v:b.id,l:`${b.reference?b.reference+" — ":""}${b.adresse} — ${b.ville}`}))]}/>
        <Sel label="Type de document *" value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} options={DOC_TYPES.map(t=>({v:t.v,l:t.l}))}/>
        <Field label="Nom du document *" placeholder="ex: Bail Délice Royal 2025" value={f.nom} onChange={e=>setF(p=>({...p,nom:e.target.value}))}/>
        <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={handleDrop} onClick={()=>fileRef.current.click()}
          style={{border:`2px dashed ${drag?"#3b82f6":"#e2e8f0"}`,borderRadius:12,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:drag?"#eff6ff":"#f8fafc",marginBottom:16}}>
          {file?<div><p style={{fontWeight:600,color:"#1a2d4e",marginBottom:4}}>📄 {file.name}</p><p style={{fontSize:12,color:"#94a3b8"}}>{fmtSize(file.size)}</p></div>
          :<div><Upload size={24} color="#94a3b8" style={{margin:"0 auto 8px"}}/><p style={{color:"#64748b",fontWeight:500}}>Glissez un fichier ici</p><p style={{fontSize:12,color:"#94a3b8",marginTop:4}}>PDF, image, Excel — ou cliquez pour parcourir</p></div>}
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls" style={{display:"none"}} onChange={e=>{const picked=e.target.files[0];if(picked){setFile(picked);if(!f.nom)setF(p=>({...p,nom:picked.name.replace(/\.[^/.]+$/, "")}));}}}/>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn v="ghost" onClick={()=>{setOpen(false);setFile(null);}}>Annuler</Btn>
          <Btn onClick={handleUpload} disabled={uploading||!file||!f.bien_id||!f.nom} style={{opacity:(uploading||!file||!f.bien_id||!f.nom)?0.5:1}}>{uploading?"Envoi...":"Enregistrer"}</Btn>
        </div>
      </Modal>}
    </div>
  );
};

// ─── CHAT IA ──────────────────────────────────────────────────────────────────

const ChatPage = ({ biens, locataires, baux, transactions, societe, reload }) => {
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Bonjour ! Je suis votre assistant expert immobilier PHANTOM. Je connais votre portefeuille en temps réel et peux vous aider à analyser vos données, rédiger des courriers, ou ajouter directement des informations dans l'application. Comment puis-je vous aider ?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const getSystemPrompt = () => {
    const bauxActifs = baux.filter(b=>b.actif);
    const totalLoyers = bauxActifs.reduce((s,b) => s + getLoyerActuel(b) + b.charges, 0);
    const impayeTotal = transactions.filter(t=>t.statut==="impayé").reduce((s,t)=>s+t.montant_loyer+t.montant_charges,0);
    
    const biensDesc = biens.map(b => 
      `- ${b.reference||b.adresse}: ${b.surface}m², ${b.activite||b.type}, loyer ${fmt(b.loyer_mensuel)}/mois, prix achat ${fmt(b.prix_achat)}, TF ${fmt(b.taxe_fonciere)}/an, statut: ${b.statut_bien||"Actif"}`
    ).join("\n");
    
    const locDesc = locataires.map(l => 
      `- ${l.raison_sociale||`${l.prenom} ${l.nom}`}: ${l.email||""} ${l.telephone||""}`
    ).join("\n");
    
    const bauxDesc = baux.map(b => {
      const loc = locataires.find(l=>l.id===b.locataire_id);
      const bien = biens.find(x=>x.id===b.bien_id);
      const nimp = transactions.filter(t=>t.bail_id===b.id&&t.statut==="impayé").length;
      return `- ${bien?.reference||bien?.adresse||"?"} → ${loc?.raison_sociale||`${loc?.prenom} ${loc?.nom}`||"?"}: loyer ${fmt(getLoyerActuel(b))} HT/mois${b.loyer_an1?` (progressif: an1=${fmt(b.loyer_an1)}, an2=${fmt(b.loyer_an2||0)})`:""}, charges ${fmt(b.charges)}, bail du ${b.date_debut} au ${b.date_fin||"∞"}, ${b.type_bail||"bail commercial"}, indice ${b.indice_revision||"ILC"}${nimp>0?`, ⚠️ ${nimp} impayé(s)`:""}`
    }).join("\n");

    return `Tu es un assistant expert en immobilier commercial français pour la société ${societe?.nom||"PHANTOM"} — Gestion Immobilière.

Tu as accès en temps réel au portefeuille complet :

BIENS (${biens.length}) :
${biensDesc||"Aucun bien"}

LOCATAIRES (${locataires.length}) :
${locDesc||"Aucun locataire"}

BAUX ACTIFS (${bauxActifs.length}) :
${bauxDesc||"Aucun bail"}

FINANCES :
- Loyers mensuels attendus : ${fmt(totalLoyers)} HT/mois (${fmt(totalLoyers*1.2)} TTC)
- Total encaissé : ${fmt(transactions.filter(t=>t.statut==="payé").reduce((s,t)=>s+t.montant_loyer+t.montant_charges,0))}
- Impayés en cours : ${fmt(impayeTotal)}
${societe?.iban?`\nIBAN société : ${societe.iban}`:""}
${societe?.siret?`SIRET : ${societe.siret}`:""}

Tu peux :
1. Répondre à des questions sur le portefeuille, les loyers, la rentabilité, les baux
2. Rédiger des courriers professionnels (relances, mises en demeure, réponses à syndic)
3. Calculer des indicateurs (rendement, taux d'occupation, cashflow)
4. Conseiller sur la gestion locative et le droit commercial français
5. Utiliser tes outils pour créer directement des locataires ou biens dans l'application

Réponds en français, de façon professionnelle mais directe. Utilise des chiffres précis tirés du portefeuille.`;
  };

  const tools = [
    {
      name: "create_locataire",
      description: "Crée un nouveau locataire dans PHANTOM",
      input_schema: {
        type: "object",
        properties: {
          raison_sociale: { type: "string", description: "Nom de la société" },
          prenom: { type: "string", description: "Prénom du gérant" },
          nom: { type: "string", description: "Nom du gérant" },
          email: { type: "string", description: "Email" },
          telephone: { type: "string", description: "Téléphone" }
        },
        required: ["nom"]
      }
    },
    {
      name: "create_bien",
      description: "Crée un nouveau bien immobilier dans PHANTOM",
      input_schema: {
        type: "object",
        properties: {
          reference: { type: "string", description: "Référence courte ex: Diderot" },
          adresse: { type: "string" },
          ville: { type: "string" },
          code_postal: { type: "string" },
          surface: { type: "number" },
          type: { type: "string", enum: ["Commercial","Habitation","Mixte"] },
          activite: { type: "string", description: "Activité ex: Restaurant" },
          prix_achat: { type: "number" },
          loyer_mensuel: { type: "number" },
          taxe_fonciere: { type: "number" }
        },
        required: ["adresse","ville"]
      }
    }
  ];

  const executeTool = async (toolName, toolInput) => {
    const {data:{user}} = await supabase.auth.getUser();
    if (toolName === "create_locataire") {
      const { error } = await supabase.from("locataires").insert({...toolInput, user_id:user.id});
      if (!error) { reload(); return `✅ Locataire "${toolInput.raison_sociale||toolInput.nom}" créé avec succès dans PHANTOM.`; }
      return `❌ Erreur lors de la création : ${error.message}`;
    }
    if (toolName === "create_bien") {
      const { error } = await supabase.from("biens").insert({...toolInput, statut_bien:"Actif", user_id:user.id});
      if (!error) { reload(); return `✅ Bien "${toolInput.reference||toolInput.adresse}" créé avec succès dans PHANTOM.`; }
      return `❌ Erreur lors de la création : ${error.message}`;
    }
    return "Outil inconnu";
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role:"user", content:input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = newMessages.map(m => ({ role:m.role, content:m.content }));
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          system: getSystemPrompt(),
          tools,
          messages: apiMessages
        })
      });

      const data = await response.json();
      
      if (data.stop_reason === "tool_use") {
        const toolUseBlock = data.content.find(b => b.type === "tool_use");
        const textBlock = data.content.find(b => b.type === "text");
        
        let assistantContent = textBlock?.text || "";
        const toolResult = await executeTool(toolUseBlock.name, toolUseBlock.input);
        assistantContent += (assistantContent ? "\n\n" : "") + toolResult;
        
        setMessages(prev => [...prev, { role:"assistant", content:assistantContent }]);
      } else {
        const text = data.content?.find(b => b.type === "text")?.text || "Désolé, je n'ai pas pu traiter votre demande.";
        setMessages(prev => [...prev, { role:"assistant", content:text }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role:"assistant", content:`❌ Erreur de connexion : ${err.message}` }]);
    }
    setLoading(false);
  };

  const suggestions = [
    "Quel est le loyer total mensuel de mon portefeuille ?",
    "Calcule le rendement brut de Diderot",
    "Rédige une relance pour les impayés",
    "Quels baux arrivent à révision bientôt ?"
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 80px)"}}>
      <div style={{marginBottom:24}}>
        <h1 style={{fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2}}>Assistant IA</h1>
        <p style={{color:"#94a3b8",fontSize:14}}>Expert immobilier — connaît votre portefeuille en temps réel</p>
      </div>

      <div style={{...S.card, flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
        <div style={{flex:1, overflowY:"auto", padding:24, display:"flex", flexDirection:"column", gap:16}}>
          {messages.map((m, i) => (
            <div key={i} style={{display:"flex", gap:12, alignItems:"flex-start", flexDirection:m.role==="user"?"row-reverse":"row"}}>
              <div style={{width:32, height:32, borderRadius:10, background:m.role==="user"?"#1a2d4e":"#3b82f6", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                {m.role==="user" ? <span style={{color:"#fff",fontSize:12,fontWeight:700}}>A</span> : <Bot size={16} color="#fff"/>}
              </div>
              <div style={{maxWidth:"75%", background:m.role==="user"?"#1a2d4e":"#f8fafc", color:m.role==="user"?"#fff":"#1e293b", padding:"12px 16px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", fontSize:14, lineHeight:1.7, whiteSpace:"pre-wrap"}}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{display:"flex", gap:12, alignItems:"center"}}>
              <div style={{width:32,height:32,borderRadius:10,background:"#3b82f6",display:"flex",alignItems:"center",justifyContent:"center"}}><Bot size={16} color="#fff"/></div>
              <div style={{background:"#f8fafc", padding:"12px 16px", borderRadius:"16px 16px 16px 4px"}}>
                <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#94a3b8",animation:"bounce 1.2s infinite",animationDelay:`${i*0.2}s`}}/>)}</div>
                <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
              </div>
            </div>
          )}
          <div ref={messagesEndRef}/>
        </div>

        {messages.length <= 1 && (
          <div style={{padding:"0 24px 16px", display:"flex", flexWrap:"wrap", gap:8}}>
            {suggestions.map((s,i) => (
              <button key={i} onClick={()=>setInput(s)} style={{background:"#f1f5f9",border:"none",borderRadius:20,padding:"6px 14px",fontSize:12,color:"#64748b",cursor:"pointer",fontFamily:"inherit"}}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div style={{padding:"16px 24px", borderTop:"1px solid #f1f5f9", display:"flex", gap:12}}>
          <input
            ref={inputRef}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
            placeholder="Posez votre question ou demandez une action..."
            style={{flex:1, padding:"12px 16px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", fontFamily:"inherit", color:"#1e293b"}}
            onFocus={e=>e.target.style.borderColor="#3b82f6"}
            onBlur={e=>e.target.style.borderColor="#e2e8f0"}
          />
          <button onClick={sendMessage} disabled={loading||!input.trim()} style={{background:"#1a2d4e",color:"#fff",border:"none",borderRadius:10,padding:"12px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:6,opacity:loading||!input.trim()?0.5:1}}>
            <Send size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── PARAMÈTRES ───────────────────────────────────────────────────────────────

const ParametresPage = ({ societe, reload }) => {
  const [f,setF]=useState(societe||{nom:"",nom_affiche:"",siret:"",rcs:"",iban:"",bic:"",adresse:"",code_postal:"",ville:"",telephone:"",email:"",ape:"",tva_intracommunautaire:"",capital:"",nom_banque:"",adresse_banque:""});
  const [saved,setSaved]=useState(false);
  const save=async()=>{ const {data:{user}}=await supabase.auth.getUser(); await supabase.from("societe").upsert({...f,user_id:user.id},{onConflict:"user_id"}); reload(); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  return (
    <div>
      <h1 style={{fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2}}>Paramètres</h1>
      <p style={{color:"#94a3b8",marginBottom:32}}>Informations de votre société</p>
      <div style={{...S.card,padding:32,maxWidth:680}}>
        <h2 style={{fontSize:17,fontWeight:700,color:"#1a2d4e",marginBottom:4}}>Société</h2>
        <p style={{fontSize:13,color:"#94a3b8",marginBottom:22}}>Ces informations apparaîtront sur vos documents.</p>
        <Grid2>
          <Field label="Nom de la société" value={f.nom||""} onChange={e=>setF(p=>({...p,nom:e.target.value}))}/>
          <Field label="Nom affiché" value={f.nom_affiche||""} onChange={e=>setF(p=>({...p,nom_affiche:e.target.value}))}/>
          <Field label="SIRET" value={f.siret||""} onChange={e=>setF(p=>({...p,siret:e.target.value}))}/>
          <Field label="RCS" value={f.rcs||""} onChange={e=>setF(p=>({...p,rcs:e.target.value}))}/>
          <Field label="APE" value={f.ape||""} onChange={e=>setF(p=>({...p,ape:e.target.value}))}/>
          <Field label="TVA Intracommunautaire" value={f.tva_intracommunautaire||""} onChange={e=>setF(p=>({...p,tva_intracommunautaire:e.target.value}))}/>
          <Field label="Capital (€)" type="number" value={f.capital||""} onChange={e=>setF(p=>({...p,capital:e.target.value}))}/>
          <Field label="Téléphone" value={f.telephone||""} onChange={e=>setF(p=>({...p,telephone:e.target.value}))}/>
          <Field label="Email" value={f.email||""} onChange={e=>setF(p=>({...p,email:e.target.value}))}/>
        </Grid2>
        <AddressField label="Adresse siège" value={f.adresse||""} onChange={v=>{ const match=v.match(/,\s*(\d{5})\s+(.+)$/); if(match){setF(p=>({...p,adresse:v.split(",")[0].trim(),code_postal:match[1],ville:match[2].trim()}));}else{setF(p=>({...p,adresse:v}));} }}/>
        <Grid2>
          <Field label="Code postal" value={f.code_postal||""} onChange={e=>setF(p=>({...p,code_postal:e.target.value}))}/>
          <Field label="Ville" value={f.ville||""} onChange={e=>setF(p=>({...p,ville:e.target.value}))}/>
        </Grid2>
        <h2 style={{fontSize:15,fontWeight:700,color:"#1a2d4e",marginBottom:12,marginTop:8}}>Coordonnées bancaires</h2>
        <Grid2>
          <Field label="IBAN" value={f.iban||""} onChange={e=>setF(p=>({...p,iban:e.target.value}))}/>
          <Field label="BIC" value={f.bic||""} onChange={e=>setF(p=>({...p,bic:e.target.value}))}/>
          <Field label="Nom de la banque" value={f.nom_banque||""} onChange={e=>setF(p=>({...p,nom_banque:e.target.value}))}/>
        </Grid2>
        <Field label="Adresse de la banque" value={f.adresse_banque||""} onChange={e=>setF(p=>({...p,adresse_banque:e.target.value}))}/>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8}}>
          <Btn onClick={save}>Enregistrer</Btn>
          {saved&&<span style={{color:"#16a34a",fontSize:13,fontWeight:600}}>✅ Sauvegardé !</span>}
        </div>
      </div>
    </div>
  );
};

// ─── NAV & APP ────────────────────────────────────────────────────────────────

const NAV = [
  {k:"dashboard",l:"Tableau de bord",I:LayoutDashboard},
  {k:"biens",l:"Biens",I:Building2},
  {k:"locataires",l:"Locataires",I:Users},
  {k:"baux",l:"Baux",I:FileText},
  {k:"finances",l:"Finances",I:Calendar},
  {k:"transactions",l:"Transactions",I:CreditCard},
  {k:"documents",l:"Coffre-fort",I:FolderOpen},
  {k:"chat",l:"Assistant IA",I:MessageSquare},
];

export default function App() {
  const [session,setSession]=useState(null);
  const [loading,setLoading]=useState(true);
  const [page,setPage]=useState("dashboard");
  const [biens,setBiens]=useState([]);
  const [locataires,setLocataires]=useState([]);
  const [baux,setBaux]=useState([]);
  const [transactions,setTransactions]=useState([]);
  const [societe,setSociete]=useState(null);
  const [documents,setDocuments]=useState([]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ setSession(session); setLoading(false); });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  const loadAll=async()=>{
    const [b,l,ba,t,s,d]=await Promise.all([
      supabase.from("biens").select("*").order("created_at"),
      supabase.from("locataires").select("*").order("created_at"),
      supabase.from("baux").select("*").order("created_at"),
      supabase.from("transactions").select("*").order("created_at"),
      supabase.from("societe").select("*").maybeSingle(),
      supabase.from("documents").select("*").order("created_at",{ascending:false}),
    ]);
    if(b.data)setBiens(b.data);
    if(l.data)setLocataires(l.data);
    if(ba.data)setBaux(ba.data);
    if(t.data)setTransactions(t.data);
    if(s.data)setSociete(s.data);
    if(d.data)setDocuments(d.data);
  };

  useEffect(()=>{ if(session)loadAll(); },[session]);

  if(loading)return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}><Spinner/></div>;
  if(!session)return <Login onLogin={()=>supabase.auth.getSession().then(({data:{session}})=>setSession(session))}/>;

  const impCount=transactions.filter(t=>t.statut==="impayé").length;
  const props={biens,locataires,baux,transactions,societe,documents,reload:loadAll};

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#f0f4f8",fontFamily:"'Helvetica Neue',Arial,sans-serif"}}>
      <div style={S.sidebar}>
        <div style={{padding:"26px 20px",borderBottom:"1px solid rgba(255,255,255,0.07)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{background:"#3b82f6",width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}><Building2 size={20} color="#fff"/></div>
            <div><p style={{color:"#fff",fontWeight:800,fontSize:14,letterSpacing:2}}>PHANTOM</p><p style={{color:"rgba(255,255,255,0.4)",fontSize:10}}>Gestion Immobilière</p></div>
          </div>
        </div>
        <nav style={{flex:1,padding:"14px 10px",overflowY:"auto"}}>
          <p style={{color:"rgba(255,255,255,0.28)",fontSize:9,letterSpacing:"1px",fontWeight:700,textTransform:"uppercase",padding:"0 10px",marginBottom:6}}>Navigation</p>
          {NAV.map(({k,l,I})=>{
            const active=page===k;
            const isChat=k==="chat";
            return <button key={k} onClick={()=>setPage(k)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",textAlign:"left",background:active?"rgba(59,130,246,0.18)":isChat?"rgba(59,130,246,0.08)":"transparent",color:active?"#60a5fa":isChat?"#93c5fd":"rgba(255,255,255,0.55)",fontWeight:active?600:400,fontSize:13,marginBottom:2,fontFamily:"inherit"}}>
              <I size={15}/>{l}
              {k==="transactions"&&impCount>0&&<span style={{marginLeft:"auto",background:"#ef4444",color:"#fff",borderRadius:20,fontSize:9,fontWeight:700,padding:"1px 6px"}}>{impCount}</span>}
              {isChat&&!active&&<span style={{marginLeft:"auto",background:"#3b82f6",color:"#fff",borderRadius:20,fontSize:8,fontWeight:700,padding:"1px 5px"}}>IA</span>}
            </button>;
          })}
        </nav>
        <div style={{padding:"10px"}}>
          <button onClick={()=>setPage("parametres")} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",background:page==="parametres"?"rgba(59,130,246,0.18)":"transparent",color:page==="parametres"?"#60a5fa":"rgba(255,255,255,0.45)",fontSize:13,marginBottom:2,fontFamily:"inherit"}}><Settings size={15}/>Paramètres</button>
          <button onClick={()=>supabase.auth.signOut()} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",background:"transparent",color:"rgba(255,255,255,0.35)",fontSize:13,fontFamily:"inherit"}}><LogOut size={15}/>Déconnexion</button>
        </div>
      </div>
      <div style={{marginLeft:240,flex:1,padding:"40px"}}>
        {page==="dashboard"&&<Dashboard {...props}/>}
        {page==="biens"&&<BiensPage {...props}/>}
        {page==="locataires"&&<LocatairesPage {...props}/>}
        {page==="baux"&&<BauxPage {...props}/>}
        {page==="finances"&&<FinancesPage {...props}/>}
        {page==="transactions"&&<TransactionsPage {...props}/>}
        {page==="documents"&&<DocumentsPage {...props}/>}
        {page==="chat"&&<ChatPage {...props}/>}
        {page==="parametres"&&<ParametresPage {...props}/>}
      </div>
    </div>
  );
}
