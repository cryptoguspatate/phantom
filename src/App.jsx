import { useState, useMemo } from "react";
import {
  Building2, Users, FileText, CreditCard, Settings, LogOut,
  LayoutDashboard, Plus, X, AlertTriangle, Euro, TrendingUp,
  Printer, Trash2, CheckCircle
} from "lucide-react";

// ─── UTILS ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n || 0);
const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const today = () => new Date().toISOString().slice(0, 10);

// ─── SAMPLE DATA (remplacé par Supabase en prod) ─────────────────────────────

const INIT_SOCIETE = { nom: "SAS PHANTOM", nomAffiche: "PHANTOM", siret: "", rcs: "", iban: "", bic: "" };

const SAMPLE_BIENS = [
  { id: "b1", adresse: "12 rue de Rivoli", ville: "Paris", codePostal: "75001", surface: 45, type: "Habitation", taxeFonciere: 1200 },
  { id: "b2", adresse: "34 avenue Haussmann", ville: "Paris", codePostal: "75008", surface: 65, type: "Habitation", taxeFonciere: 1800 },
  { id: "b3", adresse: "7 rue du Commerce", ville: "Lyon",  codePostal: "69002", surface: 80, type: "Commercial",  taxeFonciere: 2400 },
];

const SAMPLE_LOCATAIRES = [
  { id: "l1", prenom: "Marie",  nom: "Dupont",  email: "marie.dupont@mail.com",  telephone: "06 12 34 56 78" },
  { id: "l2", prenom: "Thomas", nom: "Martin",  email: "thomas.martin@mail.com", telephone: "07 23 45 67 89" },
  { id: "l3", prenom: "Sarah",  nom: "Bernard", email: "sarah.bernard@mail.com", telephone: "06 34 56 78 90" },
];

const SAMPLE_BAUX = [
  { id: "ba1", bienId: "b1", locataireId: "l1", dateDebut: "2023-01-01", dateFin: "2025-12-31", loyerHT: 850,  charges: 80,  depot: 850,  garantieGAPD: false, actif: true },
  { id: "ba2", bienId: "b2", locataireId: "l2", dateDebut: "2022-06-01", dateFin: "2025-05-31", loyerHT: 1200, charges: 120, depot: 1200, garantieGAPD: true,  actif: true },
  { id: "ba3", bienId: "b3", locataireId: "l3", dateDebut: "2024-01-01", dateFin: "2026-12-31", loyerHT: 1500, charges: 200, depot: 3000, garantieGAPD: false, actif: true },
];

const now = new Date();
const makeSampleTx = () => {
  const txs = [];
  SAMPLE_BAUX.forEach((bail) => {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const statut = i === 0 ? "en_attente" : Math.random() > 0.15 ? "payé" : "impayé";
      txs.push({
        id: uid(), bailId: bail.id,
        mois: d.getMonth(), annee: d.getFullYear(),
        montantLoyer: bail.loyerHT, montantCharges: bail.charges,
        statut, datePaiement: statut === "payé" ? new Date(d.getFullYear(), d.getMonth(), 5).toISOString().slice(0,10) : null,
        relanceCount: statut === "impayé" ? Math.floor(Math.random() * 2) : 0,
      });
    }
  });
  return txs;
};

// ─── PDF GENERATORS ──────────────────────────────────────────────────────────

const pdfAvisEcheance = (bail, bien, loc, soc, mois, annee) => {
  const total = bail.loyerHT + bail.charges;
  const periode = `${MONTHS[mois]} ${annee}`;
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Avis d'échéance – ${periode}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2d4e;padding:48px;font-size:13px;line-height:1.6}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a2d4e;padding-bottom:20px;margin-bottom:36px}
    .logo{font-size:22px;font-weight:900;letter-spacing:4px}.logo small{display:block;font-size:10px;letter-spacing:2px;color:#94a3b8;font-weight:400;margin-top:2px}
    .doc-title h1{font-size:18px;font-weight:700;text-align:right}.doc-title p{font-size:12px;color:#64748b;text-align:right}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:28px}
    .bloc h3{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px}
    .bien-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px;margin-bottom:24px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#1a2d4e;color:#fff;padding:10px 14px;text-align:left;font-size:11px;letter-spacing:.5px}
    td{padding:10px 14px;border-bottom:1px solid #f1f5f9}
    .tot td{background:#eff6ff;font-weight:700;color:#1a2d4e;border-top:2px solid #1a2d4e}
    .iban{background:#1a2d4e;color:#fff;border-radius:8px;padding:14px 20px;display:flex;justify-content:space-between;margin-bottom:20px}
    .iban .lbl{font-size:10px;letter-spacing:1px;text-transform:uppercase;opacity:.6;margin-bottom:3px}
    .iban .val{font-size:14px;font-weight:600;letter-spacing:1px}
    .note{font-size:11px;color:#94a3b8;font-style:italic}
    .footer{text-align:center;color:#94a3b8;font-size:11px;margin-top:48px;padding-top:16px;border-top:1px solid #f1f5f9}
    @media print{@page{margin:1.5cm}}
  </style></head><body>
  <div class="hdr">
    <div class="logo">${soc.nomAffiche||soc.nom}<small>Gestion Immobilière</small></div>
    <div class="doc-title"><h1>Avis d'Échéance</h1><p>Période : ${periode}</p><p>Émis le ${new Date().toLocaleDateString("fr-FR")}</p></div>
  </div>
  <div class="grid2">
    <div class="bloc"><h3>Bailleur</h3><p><strong>${soc.nom}</strong>${soc.siret?`<br>SIRET : ${soc.siret}`:""}</p></div>
    <div class="bloc"><h3>Locataire</h3><p><strong>${loc.prenom} ${loc.nom}</strong><br>${loc.email}<br>${loc.telephone}</p></div>
  </div>
  <div class="bien-box"><strong>Bien loué :</strong> ${bien.adresse}, ${bien.ville} ${bien.codePostal} &nbsp;|&nbsp; ${bien.surface} m²
    &nbsp;|&nbsp; Bail du ${new Date(bail.dateDebut).toLocaleDateString("fr-FR")} au ${bail.dateFin?new Date(bail.dateFin).toLocaleDateString("fr-FR"):"indéterminé"}</div>
  <table><thead><tr><th>Désignation</th><th style="text-align:right">Montant</th></tr></thead><tbody>
    <tr><td>Loyer hors charges</td><td style="text-align:right">${bail.loyerHT.toFixed(2)} €</td></tr>
    <tr><td>Provisions sur charges</td><td style="text-align:right">${bail.charges.toFixed(2)} €</td></tr>
    <tr class="tot"><td><strong>Total à régler avant le 5 ${periode}</strong></td><td style="text-align:right"><strong>${total.toFixed(2)} €</strong></td></tr>
  </tbody></table>
  ${soc.iban?`<div class="iban"><div><div class="lbl">IBAN</div><div class="val">${soc.iban}</div></div>${soc.bic?`<div><div class="lbl">BIC</div><div class="val">${soc.bic}</div></div>`:""}</div>`:""}
  <p class="note">Ce document est un avis d'échéance. La quittance sera remise après réception du règlement.</p>
  <div class="footer">${soc.nom} — Gestion Immobilière Privée</div>
  </body></html>`;
  const w = window.open("","_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
};

const pdfCommandement = (bail, bien, loc, soc, transactions) => {
  const impayees = transactions.filter(t => t.bailId === bail.id && t.statut === "impayé");
  const totalDu = impayees.reduce((s, t) => s + t.montantLoyer + t.montantCharges, 0);
  const rows = impayees.map(t => `<tr><td>${MONTHS[t.mois]} ${t.annee}</td><td style="text-align:right">${t.montantLoyer.toFixed(2)} €</td><td style="text-align:right">${t.montantCharges.toFixed(2)} €</td><td style="text-align:right">${(t.montantLoyer+t.montantCharges).toFixed(2)} €</td></tr>`).join("");
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Commandement de Payer</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a1a2e;padding:48px;font-size:13px;line-height:1.6}
    .hdr{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #dc2626;padding-bottom:20px;margin-bottom:28px}
    .logo{font-size:22px;font-weight:900;letter-spacing:4px;color:#1a2d4e}
    h1{font-size:20px;font-weight:900;color:#dc2626;text-transform:uppercase;letter-spacing:2px}
    .warning{background:#fff5f5;border:2px solid #dc2626;border-radius:8px;padding:14px 18px;margin-bottom:24px;color:#dc2626;font-weight:600}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:20px}
    .bloc h3{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;margin-bottom:6px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#dc2626;color:#fff;padding:10px 14px;text-align:left;font-size:11px}
    td{padding:10px 14px;border-bottom:1px solid #f1f5f9}
    .tot td{background:#fff5f5;font-weight:700;color:#dc2626;border-top:2px solid #dc2626}
    .legal{background:#f9fafb;border-left:4px solid #dc2626;padding:14px 18px;margin:20px 0;font-size:12px;color:#475569}
    .sigs{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px}
    .sig{border-top:1px solid #cbd5e1;padding-top:10px;font-size:11px;color:#94a3b8}
    @media print{@page{margin:1.5cm}}
  </style></head><body>
  <div class="hdr"><div class="logo">${soc.nomAffiche||soc.nom}</div><div><h1>Commandement de Payer</h1><p style="font-size:12px;color:#94a3b8">Émis le ${new Date().toLocaleDateString("fr-FR")}</p></div></div>
  <div class="warning">⚠ Ce document est un commandement de payer. Faute de règlement sous 2 mois, une procédure judiciaire pourra être engagée.</div>
  <div class="grid2">
    <div class="bloc"><h3>Bailleur</h3><p><strong>${soc.nom}</strong>${soc.siret?`<br>SIRET : ${soc.siret}`:""}</p></div>
    <div class="bloc"><h3>Locataire</h3><p><strong>${loc.prenom} ${loc.nom}</strong><br>${loc.email}<br>${loc.telephone}</p></div>
  </div>
  <p style="margin-bottom:16px"><strong>Bien loué :</strong> ${bien.adresse}, ${bien.ville} ${bien.codePostal}</p>
  <table><thead><tr><th>Période</th><th style="text-align:right">Loyer</th><th style="text-align:right">Charges</th><th style="text-align:right">Total</th></tr></thead>
  <tbody>${rows}<tr class="tot"><td colspan="3"><strong>TOTAL DÛ</strong></td><td style="text-align:right"><strong>${totalDu.toFixed(2)} €</strong></td></tr></tbody></table>
  <div class="legal">Conformément à la loi n°89-462 du 6 juillet 1989, nous vous mettons en demeure de régler la somme de <strong>${totalDu.toFixed(2)} €</strong> dans un délai de deux (2) mois. À défaut, une procédure d'expulsion pourra être engagée à vos frais.</div>
  ${soc.iban?`<p><strong>Règlement par virement :</strong> IBAN ${soc.iban}${soc.bic?" — BIC "+soc.bic:""}</p>`:""}
  <div class="sigs"><div class="sig"><p>Signature du bailleur</p><br><br><br></div><div class="sig"><p>Accusé de réception locataire</p><br><br><br></div></div>
  </body></html>`;
  const w = window.open("","_blank");
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 400);
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
    <input style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e2e8f0", borderRadius:8, fontSize:14, outline:"none", color:"#1e293b", fontFamily:"inherit" }}
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
  const s = { primary:{background:"#1a2d4e",color:"#fff",border:"none"}, danger:{background:"#dc2626",color:"#fff",border:"none"}, ghost:{background:"transparent",color:"#64748b",border:"1.5px solid #e2e8f0"}, green:{background:"#16a34a",color:"#fff",border:"none"}, orange:{background:"#c2410c",color:"#fff",border:"none"} }[v];
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

const PageHeader = ({ title, sub, cta }) => (
  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:32 }}>
    <div><h1 style={{ fontSize:26, fontWeight:800, color:"#1a2d4e", marginBottom:2 }}>{title}</h1><p style={{ color:"#94a3b8", fontSize:14 }}>{sub}</p></div>
    {cta}
  </div>
);

const Empty = ({ icon, text }) => (
  <div style={{ ...S.card, padding:60, textAlign:"center", border:"2px dashed #e2e8f0" }}>
    <div style={{ color:"#cbd5e1", marginBottom:12 }}>{icon}</div>
    <p style={{ color:"#94a3b8", fontWeight:500 }}>{text}</p>
  </div>
);

const Grid2 = ({ children }) => <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>{children}</div>;

// ─── LOGIN ────────────────────────────────────────────────────────────────────

const Login = ({ onLogin }) => {
  const [e, setE] = useState(""); const [p, setP] = useState("");
  return (
    <div style={{ minHeight:"100vh", background:"#f0f4f8", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:20, padding:48, width:420, boxShadow:"0 8px 40px rgba(26,45,78,0.12)" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ background:"#1a2d4e", width:64, height:64, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
            <Building2 size={30} color="#fff"/>
          </div>
          <h1 style={{ fontSize:22, fontWeight:900, color:"#1a2d4e", letterSpacing:3 }}>PHANTOM</h1>
          <p style={{ color:"#94a3b8", fontSize:14, marginTop:4 }}>Connectez-vous à votre espace</p>
        </div>
        <Field label="Email" type="email" placeholder="vous@exemple.com" value={e} onChange={x=>setE(x.target.value)}/>
        <Field label="Mot de passe" type="password" placeholder="••••••••" value={p} onChange={x=>setP(x.target.value)}/>
        <Btn style={{ width:"100%", justifyContent:"center", padding:14, marginTop:4 }} onClick={onLogin}>Se connecter</Btn>
        <p style={{ textAlign:"center", marginTop:18, fontSize:13, color:"#3b82f6", cursor:"pointer" }}>Pas encore de compte ? S'inscrire</p>
      </div>
    </div>
  );
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

const Dashboard = ({ biens, locataires, baux, transactions }) => {
  const bauxActifs = baux.filter(b => b.actif);
  const totalEnc = transactions.filter(t => t.statut==="payé").reduce((s,t)=>s+t.montantLoyer+t.montantCharges,0);
  const totalImp = transactions.filter(t => t.statut==="impayé").reduce((s,t)=>s+t.montantLoyer+t.montantCharges,0);
  const tauxOcc = biens.length ? Math.round(bauxActifs.length/biens.length*100) : 0;
  const alertes = transactions.filter(t => t.statut==="impayé");

  const kpis = [
    { l:"Biens",            v:biens.length,          icon:<Building2 size={18}/>, c:"#3b82f6" },
    { l:"Locataires",       v:locataires.length,     icon:<Users size={18}/>,     c:"#8b5cf6" },
    { l:"Baux actifs",      v:bauxActifs.length,     icon:<FileText size={18}/>,  c:"#10b981" },
    { l:"Total encaissé",   v:fmt(totalEnc),         icon:<Euro size={18}/>,      c:"#10b981" },
    { l:"Taux d'occupation",v:tauxOcc+"%",           icon:<TrendingUp size={18}/>,c:"#f59e0b" },
    { l:"Impayés",          v:fmt(totalImp),         icon:<AlertTriangle size={18}/>, c:"#ef4444" },
  ];

  return (
    <div>
      <h1 style={{ fontSize:26, fontWeight:800, color:"#1a2d4e", marginBottom:2 }}>Tableau de bord</h1>
      <p style={{ color:"#94a3b8", marginBottom:32 }}>Vue d'ensemble de votre patrimoine immobilier</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18, marginBottom:32 }}>
        {kpis.map((k,i)=>(
          <div key={i} style={{ ...S.card, padding:24 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <p style={{ fontSize:13, color:"#94a3b8", marginBottom:8, fontWeight:500 }}>{k.l}</p>
                <p style={{ fontSize:26, fontWeight:800, color:"#1a2d4e" }}>{k.v}</p>
              </div>
              <div style={{ background:k.c+"18", color:k.c, padding:10, borderRadius:10 }}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {alertes.length > 0 && (
        <div style={{ ...S.card, padding:24, border:"1px solid #fee2e2" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:18 }}>
            <AlertTriangle size={16} color="#ef4444"/>
            <h3 style={{ fontSize:15, fontWeight:700, color:"#1a2d4e" }}>Alertes impayés ({alertes.length})</h3>
          </div>
          {alertes.slice(0,6).map(a => {
            const bail = baux.find(b=>b.id===a.bailId);
            const loc = bail ? locataires.find(l=>l.id===bail.locataireId) : null;
            const bien = bail ? ['b1','b2','b3'].includes(bail.bienId) : null;
            const bienObj = biens.find(b=>b.id===bail?.bienId);
            return (
              <div key={a.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:"1px solid #f8fafc" }}>
                <div>
                  <p style={{ fontWeight:600, color:"#1a2d4e", fontSize:14 }}>{loc?`${loc.prenom} ${loc.nom}`:"—"}</p>
                  <p style={{ fontSize:12, color:"#94a3b8" }}>{bienObj?.adresse} — {MONTHS[a.mois]} {a.annee}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontWeight:700, color:"#ef4444", fontSize:15 }}>{fmt(a.montantLoyer+a.montantCharges)}</p>
                  <Badge statut="impayé"/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── BIENS ────────────────────────────────────────────────────────────────────

const BiensPage = ({ biens, setBiens }) => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ adresse:"", ville:"", codePostal:"", surface:"", type:"Habitation", taxeFonciere:"" });
  const add = () => { setBiens(p=>[...p,{...f,id:uid(),surface:+f.surface,taxeFonciere:+f.taxeFonciere}]); setOpen(false); setF({adresse:"",ville:"",codePostal:"",surface:"",type:"Habitation",taxeFonciere:""}); };

  return (
    <div>
      <PageHeader title="Biens immobiliers" sub="Gérez votre patrimoine"
        cta={<Btn onClick={()=>setOpen(true)}><Plus size={15}/>Ajouter un bien</Btn>}/>
      {biens.length===0 ? <Empty icon={<Building2 size={40}/>} text="Aucun bien — ajoutez votre premier bien immobilier."/>
      : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:18 }}>
          {biens.map(b=>(
            <div key={b.id} style={{ ...S.card, padding:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                <span style={{ background:"#eff6ff", color:"#3b82f6", fontSize:11, fontWeight:600, padding:"2px 9px", borderRadius:20 }}>{b.type}</span>
                <button onClick={()=>setBiens(p=>p.filter(x=>x.id!==b.id))} style={{ background:"none", border:"none", cursor:"pointer", color:"#cbd5e1" }}><Trash2 size={14}/></button>
              </div>
              <h3 style={{ fontSize:15, fontWeight:700, color:"#1a2d4e", marginBottom:3 }}>{b.adresse}</h3>
              <p style={{ color:"#94a3b8", fontSize:13, marginBottom:14 }}>{b.codePostal} {b.ville}</p>
              <div style={{ display:"flex", gap:20 }}>
                <div><p style={{ fontSize:11, color:"#94a3b8" }}>Surface</p><p style={{ fontWeight:700, color:"#1a2d4e" }}>{b.surface} m²</p></div>
                <div><p style={{ fontSize:11, color:"#94a3b8" }}>Taxe foncière</p><p style={{ fontWeight:700, color:"#1a2d4e" }}>{fmt(b.taxeFonciere)}</p></div>
              </div>
            </div>
          ))}
        </div>}
      {open && <Modal title="Nouveau bien" onClose={()=>setOpen(false)}>
        <Field label="Adresse *" value={f.adresse} onChange={e=>setF(p=>({...p,adresse:e.target.value}))}/>
        <Grid2><Field label="Ville" value={f.ville} onChange={e=>setF(p=>({...p,ville:e.target.value}))}/><Field label="Code postal" value={f.codePostal} onChange={e=>setF(p=>({...p,codePostal:e.target.value}))}/></Grid2>
        <Grid2>
          <Field label="Surface (m²)" type="number" value={f.surface} onChange={e=>setF(p=>({...p,surface:e.target.value}))}/>
          <Sel label="Type" value={f.type} onChange={e=>setF(p=>({...p,type:e.target.value}))} options={[{v:"Habitation",l:"Habitation"},{v:"Commercial",l:"Commercial"},{v:"Mixte",l:"Mixte"}]}/>
        </Grid2>
        <Field label="Taxe foncière (€)" type="number" value={f.taxeFonciere} onChange={e=>setF(p=>({...p,taxeFonciere:e.target.value}))}/>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:4 }}>
          <Btn v="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Ajouter</Btn>
        </div>
      </Modal>}
    </div>
  );
};

// ─── LOCATAIRES ───────────────────────────────────────────────────────────────

const LocatairesPage = ({ locataires, setLocataires }) => {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ prenom:"", nom:"", email:"", telephone:"" });
  const add = () => { setLocataires(p=>[...p,{...f,id:uid()}]); setOpen(false); setF({prenom:"",nom:"",email:"",telephone:""}); };

  return (
    <div>
      <PageHeader title="Locataires" sub="Gérez vos locataires"
        cta={<Btn onClick={()=>setOpen(true)}><Plus size={15}/>Ajouter un locataire</Btn>}/>
      {locataires.length===0 ? <Empty icon={<Users size={40}/>} text="Aucun locataire."/>
      : <div style={{ ...S.card, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Locataire","Email","Téléphone",""].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {locataires.map(l=>(
                <tr key={l.id}>
                  <td style={S.td}><div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:36,height:36,borderRadius:10,background:"#eff6ff",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#3b82f6",fontSize:13 }}>{l.prenom[0]}{l.nom[0]}</div>
                    <span style={{ fontWeight:600, color:"#1a2d4e" }}>{l.prenom} {l.nom}</span>
                  </div></td>
                  <td style={{ ...S.td, color:"#64748b" }}>{l.email}</td>
                  <td style={{ ...S.td, color:"#64748b" }}>{l.telephone}</td>
                  <td style={S.td}><button onClick={()=>setLocataires(p=>p.filter(x=>x.id!==l.id))} style={{ background:"none",border:"none",cursor:"pointer",color:"#cbd5e1" }}><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      {open && <Modal title="Nouveau locataire" onClose={()=>setOpen(false)}>
        <Grid2><Field label="Prénom *" value={f.prenom} onChange={e=>setF(p=>({...p,prenom:e.target.value}))}/><Field label="Nom *" value={f.nom} onChange={e=>setF(p=>({...p,nom:e.target.value}))}/></Grid2>
        <Field label="Email" type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))}/>
        <Field label="Téléphone" value={f.telephone} onChange={e=>setF(p=>({...p,telephone:e.target.value}))}/>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:4 }}>
          <Btn v="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Ajouter</Btn>
        </div>
      </Modal>}
    </div>
  );
};

// ─── BAUX ─────────────────────────────────────────────────────────────────────

const BauxPage = ({ baux, setBaux, biens, locataires, societe, transactions, setTransactions }) => {
  const [open, setOpen] = useState(false);
  const [docModal, setDocModal] = useState(null);
  const [f, setF] = useState({ bienId:"", locataireId:"", dateDebut:"", dateFin:"", loyerHT:"", charges:"", depot:"", garantieGAPD:false });

  const add = () => {
    const bail = { ...f, id:uid(), loyerHT:+f.loyerHT, charges:+f.charges, depot:+f.depot, actif:true };
    setBaux(p=>[...p,bail]);
    const d = new Date();
    setTransactions(p=>[...p,{ id:uid(), bailId:bail.id, mois:d.getMonth(), annee:d.getFullYear(), montantLoyer:bail.loyerHT, montantCharges:bail.charges, statut:"en_attente", datePaiement:null, relanceCount:0 }]);
    setOpen(false);
  };

  const del = id => { setBaux(p=>p.filter(b=>b.id!==id)); setTransactions(p=>p.filter(t=>t.bailId!==id)); };

  return (
    <div>
      <PageHeader title="Baux" sub="Gérez vos contrats de location"
        cta={<Btn onClick={()=>setOpen(true)}><Plus size={15}/>Nouveau bail</Btn>}/>
      {baux.length===0 ? <Empty icon={<FileText size={40}/>} text="Aucun bail — créez un bail après avoir ajouté des biens et locataires."/>
      : <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {baux.map(b => {
            const bien = biens.find(x=>x.id===b.bienId);
            const loc  = locataires.find(x=>x.id===b.locataireId);
            const nimp = transactions.filter(t=>t.bailId===b.id&&t.statut==="impayé").length;
            return (
              <div key={b.id} style={{ ...S.card, padding:22, border:nimp>0?"1px solid #fecaca":"1px solid #f1f5f9" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <h3 style={{ fontSize:15, fontWeight:700, color:"#1a2d4e" }}>{loc?`${loc.prenom} ${loc.nom}`:"—"}</h3>
                      {nimp>0&&<span style={{ background:"#fee2e2",color:"#dc2626",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20 }}>{nimp} impayé{nimp>1?"s":""}</span>}
                      {b.garantieGAPD&&<span style={{ background:"#f0fdf4",color:"#16a34a",fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20 }}>GAPD</span>}
                    </div>
                    <p style={{ fontSize:13, color:"#64748b", marginBottom:12 }}>{bien?.adresse} — {bien?.ville}</p>
                    <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
                      {[["Loyer HC",fmt(b.loyerHT)],["Charges",fmt(b.charges)],["Total CC",fmt(b.loyerHT+b.charges)],["Dépôt",fmt(b.depot)]].map(([l,v])=>(
                        <div key={l}><p style={{ fontSize:11,color:"#94a3b8" }}>{l}</p><p style={{ fontWeight:700,color:"#1a2d4e",fontSize:14 }}>{v}</p></div>
                      ))}
                      <div><p style={{ fontSize:11,color:"#94a3b8" }}>Période</p><p style={{ fontWeight:600,color:"#1a2d4e",fontSize:13 }}>{b.dateDebut} → {b.dateFin||"∞"}</p></div>
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8, alignItems:"flex-end" }}>
                    <Btn v="ghost" onClick={()=>setDocModal({bail:b,bien,loc})} style={{ fontSize:12, padding:"6px 12px" }}><Printer size={13}/>Documents</Btn>
                    <button onClick={()=>del(b.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#cbd5e1" }}><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>}

      {open && <Modal title="Nouveau bail" onClose={()=>setOpen(false)}>
        <Sel label="Bien *" value={f.bienId} onChange={e=>setF(p=>({...p,bienId:e.target.value}))} options={[{v:"",l:"Sélectionner un bien"},...biens.map(b=>({v:b.id,l:`${b.adresse} — ${b.ville}`}))]}/>
        <Sel label="Locataire *" value={f.locataireId} onChange={e=>setF(p=>({...p,locataireId:e.target.value}))} options={[{v:"",l:"Sélectionner un locataire"},...locataires.map(l=>({v:l.id,l:`${l.prenom} ${l.nom}`}))]}/>
        <Grid2><Field label="Date de début *" type="date" value={f.dateDebut} onChange={e=>setF(p=>({...p,dateDebut:e.target.value}))}/><Field label="Date de fin" type="date" value={f.dateFin} onChange={e=>setF(p=>({...p,dateFin:e.target.value}))}/></Grid2>
        <Grid2><Field label="Loyer HT (€) *" type="number" value={f.loyerHT} onChange={e=>setF(p=>({...p,loyerHT:e.target.value}))}/><Field label="Charges (€)" type="number" value={f.charges} onChange={e=>setF(p=>({...p,charges:e.target.value}))}/></Grid2>
        <Field label="Dépôt de garantie (€)" type="number" value={f.depot} onChange={e=>setF(p=>({...p,depot:e.target.value}))}/>
        <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:"#1a2d4e",marginBottom:16 }}>
          <input type="checkbox" checked={f.garantieGAPD} onChange={e=>setF(p=>({...p,garantieGAPD:e.target.checked}))}/> Garantie GAPD
        </label>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
          <Btn v="ghost" onClick={()=>setOpen(false)}>Annuler</Btn><Btn onClick={add}>Créer le bail</Btn>
        </div>
      </Modal>}

      {docModal && <Modal title="Générer un document" onClose={()=>setDocModal(null)} width={480}>
        <p style={{ color:"#64748b", marginBottom:20, fontSize:14 }}>{docModal.loc?.prenom} {docModal.loc?.nom} — {docModal.bien?.adresse}</p>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ background:"#f8fafc",borderRadius:10,padding:18,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <p style={{ fontWeight:600,color:"#1a2d4e",marginBottom:2 }}>Avis d'échéance</p>
              <p style={{ fontSize:12,color:"#94a3b8" }}>{MONTHS[now.getMonth()]} {now.getFullYear()}</p>
            </div>
            <Btn onClick={()=>{pdfAvisEcheance(docModal.bail,docModal.bien,docModal.loc,societe,now.getMonth(),now.getFullYear());setDocModal(null);}}><Printer size={13}/>PDF</Btn>
          </div>
          {transactions.filter(t=>t.bailId===docModal.bail.id&&t.statut==="impayé").length>0 && (
            <div style={{ background:"#fff5f5",borderRadius:10,padding:18,display:"flex",justifyContent:"space-between",alignItems:"center",border:"1px solid #fee2e2" }}>
              <div>
                <p style={{ fontWeight:600,color:"#dc2626",marginBottom:2 }}>Commandement de payer</p>
                <p style={{ fontSize:12,color:"#94a3b8" }}>{transactions.filter(t=>t.bailId===docModal.bail.id&&t.statut==="impayé").length} impayé(s)</p>
              </div>
              <Btn v="danger" onClick={()=>{pdfCommandement(docModal.bail,docModal.bien,docModal.loc,societe,transactions);setDocModal(null);}}><Printer size={13}/>PDF</Btn>
            </div>
          )}
        </div>
      </Modal>}
    </div>
  );
};

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

const TransactionsPage = ({ transactions, setTransactions, baux, biens, locataires }) => {
  const markPaid = id => setTransactions(p=>p.map(t=>t.id===id?{...t,statut:"payé",datePaiement:today()}:t));
  const relancer = id => setTransactions(p=>p.map(t=>t.id===id?{...t,relanceCount:t.relanceCount+1}:t));

  const rows = transactions.map(t => {
    const bail = baux.find(b=>b.id===t.bailId);
    const loc  = bail ? locataires.find(l=>l.id===bail.locataireId) : null;
    const bien = bail ? biens.find(b=>b.id===bail.bienId) : null;
    return { ...t, loc, bien };
  }).sort((a,b)=>b.annee-a.annee||b.mois-a.mois);

  return (
    <div>
      <h1 style={{ fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2 }}>Transactions</h1>
      <p style={{ color:"#94a3b8",marginBottom:32 }}>Historique des avis d'échéance et quittances</p>
      {rows.length===0 ? <Empty icon={<CreditCard size={40}/>} text="Les transactions seront générées automatiquement à partir de vos baux."/>
      : <div style={{ ...S.card, overflow:"hidden" }}>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead><tr>{["Période","Locataire","Bien","Montant","Statut","Actions"].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(t=>(
                <tr key={t.id}>
                  <td style={{ ...S.td,fontWeight:600,color:"#1a2d4e" }}>{MONTHS[t.mois]} {t.annee}</td>
                  <td style={S.td}>{t.loc?`${t.loc.prenom} ${t.loc.nom}`:"—"}</td>
                  <td style={{ ...S.td,color:"#64748b",fontSize:13 }}>{t.bien?.adresse?.slice(0,22)}…</td>
                  <td style={{ ...S.td,fontWeight:700 }}>{fmt(t.montantLoyer+t.montantCharges)}</td>
                  <td style={S.td}><Badge statut={t.statut}/></td>
                  <td style={S.td}>
                    <div style={{ display:"flex",gap:6 }}>
                      {t.statut!=="payé"&&<button onClick={()=>markPaid(t.id)} style={{ background:"#f0fdf4",color:"#16a34a",border:"none",borderRadius:6,padding:"5px 10px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}><CheckCircle size={12}/>Payé</button>}
                      {t.statut==="impayé"&&<button onClick={()=>relancer(t.id)} style={{ background:"#fff7ed",color:"#c2410c",border:"none",borderRadius:6,padding:"5px 10px",fontSize:12,fontWeight:600,cursor:"pointer" }}>↺ Relance{t.relanceCount>0?` (${t.relanceCount})`:""}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
    </div>
  );
};

// ─── PARAMÈTRES ───────────────────────────────────────────────────────────────

const ParametresPage = ({ societe, setSociete }) => {
  const [f, setF] = useState(societe);
  return (
    <div>
      <h1 style={{ fontSize:26,fontWeight:800,color:"#1a2d4e",marginBottom:2 }}>Paramètres</h1>
      <p style={{ color:"#94a3b8",marginBottom:32 }}>Informations de votre société</p>
      <div style={{ ...S.card, padding:32, maxWidth:640 }}>
        <h2 style={{ fontSize:17,fontWeight:700,color:"#1a2d4e",marginBottom:4 }}>Société</h2>
        <p style={{ fontSize:13,color:"#94a3b8",marginBottom:22 }}>Ces informations apparaîtront sur vos documents (quittances, avis).</p>
        <Grid2>
          <Field label="Nom de la société" value={f.nom} onChange={e=>setF(p=>({...p,nom:e.target.value}))}/>
          <Field label="Nom affiché" value={f.nomAffiche} onChange={e=>setF(p=>({...p,nomAffiche:e.target.value}))}/>
          <Field label="SIRET" value={f.siret} onChange={e=>setF(p=>({...p,siret:e.target.value}))}/>
          <Field label="RCS" value={f.rcs} onChange={e=>setF(p=>({...p,rcs:e.target.value}))}/>
          <Field label="IBAN" value={f.iban} onChange={e=>setF(p=>({...p,iban:e.target.value}))}/>
          <Field label="BIC" value={f.bic} onChange={e=>setF(p=>({...p,bic:e.target.value}))}/>
        </Grid2>
        <Btn onClick={()=>setSociete(f)}>Enregistrer</Btn>
      </div>
    </div>
  );
};

// ─── NAV CONFIG ───────────────────────────────────────────────────────────────

const NAV = [
  { k:"dashboard",    l:"Tableau de bord", I:LayoutDashboard },
  { k:"biens",        l:"Biens",           I:Building2 },
  { k:"locataires",   l:"Locataires",      I:Users },
  { k:"baux",         l:"Baux",            I:FileText },
  { k:"transactions", l:"Transactions",    I:CreditCard },
];

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [authed,  setAuthed]       = useState(false);
  const [page,    setPage]         = useState("dashboard");
  const [societe, setSociete]      = useState(INIT_SOCIETE);
  const [biens,   setBiens]        = useState(SAMPLE_BIENS);
  const [locataires,setLocataires] = useState(SAMPLE_LOCATAIRES);
  const [baux,    setBaux]         = useState(SAMPLE_BAUX);
  const [transactions,setTransactions] = useState(makeSampleTx);

  if (!authed) return <Login onLogin={()=>setAuthed(true)}/>;

  const impCount = transactions.filter(t=>t.statut==="impayé").length;
  const props = { biens, setBiens, locataires, setLocataires, baux, setBaux, transactions, setTransactions, societe, setSociete };

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f0f4f8", fontFamily:"'Helvetica Neue',Arial,sans-serif" }}>
      {/* ── Sidebar ── */}
      <div style={S.sidebar}>
        <div style={{ padding:"26px 20px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ background:"#3b82f6",width:38,height:38,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Building2 size={20} color="#fff"/>
            </div>
            <div>
              <p style={{ color:"#fff",fontWeight:800,fontSize:14,letterSpacing:2 }}>PHANTOM</p>
              <p style={{ color:"rgba(255,255,255,0.4)",fontSize:10 }}>Gestion Immobilière</p>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"14px 10px" }}>
          <p style={{ color:"rgba(255,255,255,0.28)",fontSize:9,letterSpacing:"1px",fontWeight:700,textTransform:"uppercase",padding:"0 10px",marginBottom:6 }}>Navigation</p>
          {NAV.map(({k,l,I})=>{
            const active = page===k;
            return (
              <button key={k} onClick={()=>setPage(k)} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",textAlign:"left",background:active?"rgba(59,130,246,0.18)":"transparent",color:active?"#60a5fa":"rgba(255,255,255,0.55)",fontWeight:active?600:400,fontSize:13,marginBottom:2,fontFamily:"inherit" }}>
                <I size={15}/>{l}
                {k==="transactions"&&impCount>0&&<span style={{ marginLeft:"auto",background:"#ef4444",color:"#fff",borderRadius:20,fontSize:9,fontWeight:700,padding:"1px 6px" }}>{impCount}</span>}
              </button>
            );
          })}
        </nav>
        <div style={{ padding:"10px" }}>
          <button onClick={()=>setPage("parametres")} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",background:page==="parametres"?"rgba(59,130,246,0.18)":"transparent",color:page==="parametres"?"#60a5fa":"rgba(255,255,255,0.45)",fontSize:13,marginBottom:2,fontFamily:"inherit" }}><Settings size={15}/>Paramètres</button>
          <button onClick={()=>setAuthed(false)} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",background:"transparent",color:"rgba(255,255,255,0.35)",fontSize:13,fontFamily:"inherit" }}><LogOut size={15}/>Déconnexion</button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ marginLeft:240, flex:1, padding:"40px" }}>
        {page==="dashboard"    && <Dashboard    {...props}/>}
        {page==="biens"        && <BiensPage    {...props}/>}
        {page==="locataires"   && <LocatairesPage {...props}/>}
        {page==="baux"         && <BauxPage     {...props}/>}
        {page==="transactions" && <TransactionsPage {...props}/>}
        {page==="parametres"   && <ParametresPage {...props}/>}
      </div>
    </div>
  );
}
