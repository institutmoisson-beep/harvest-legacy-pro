import { Link } from "react-router-dom";
import { Sprout, Users, Shield, TrendingUp, HeartHandshake, Wallet, ArrowRight, Sparkles } from "lucide-react";
import MemberHubSheet from "@/components/home/MemberHubSheet";

const display = { fontFamily: "'DM Serif Display', serif" };
const sans = { fontFamily: "'Fira Sans', sans-serif" };

// Palette : Vert Moov #00A859 · Violet #7C3AED · Noir #0A0A0A · Blanc
const MOOV = "#00A859";
const MOOV_DARK = "#007A40";
const VIOLET = "#7C3AED";
const VIOLET_LIGHT = "#A78BFA";
const NOIR = "#0A0A0A";

const STORIES = [
  {
    name: "Awa, 34 ans",
    role: "Maman entrepreneure · Abidjan",
    text: "Grâce aux Moissonneurs, j'ai pu ouvrir mon petit commerce et payer l'école de mes trois enfants. Aujourd'hui, j'aide à mon tour d'autres femmes à se lancer.",
    color: MOOV,
  },
  {
    name: "Ibrahim, 27 ans",
    role: "Étudiant devenu mentor · Dakar",
    text: "J'ai commencé avec zéro franc. En invitant mes amis, j'ai bâti une équipe de 60 personnes. Mes commissions financent mes études jusqu'au doctorat.",
    color: VIOLET,
  },
  {
    name: "Famille Koné",
    role: "Solidarité villageoise · Bamako",
    text: "Quand mon père est tombé malade, la cagnotte des Moissonneurs et le fonds commun ont couvert les frais d'hospitalisation. On n'était plus seuls.",
    color: NOIR,
  },
  {
    name: "Marie, 41 ans",
    role: "Propriétaire MSN Immo · Lomé",
    text: "J'ai mis ma chambre en location via MSN Immo. En 6 mois, j'ai épargné assez pour acheter un nouveau terrain. La communauté me dépasse.",
    color: MOOV,
  },
];

const Index = () => {
  return (
    <div style={sans} className="w-full bg-white text-[#0A0A0A] overflow-x-hidden">
      {/* NAV */}
      <nav className="px-5 md:px-10 py-4 flex justify-between items-center border-b border-black/5 bg-white/95 backdrop-blur sticky top-0 z-50">
        <Link to="/" className="text-xl md:text-2xl font-black tracking-tight">
          Les <span style={{ color: MOOV }}>Moissonneurs</span>
        </Link>
        <div className="hidden md:flex gap-8 text-xs font-bold uppercase tracking-[0.2em]">
          <a href="#esprit" className="hover:opacity-60 transition">Esprit</a>
          <a href="#ecosysteme" className="hover:opacity-60 transition">Écosystème</a>
          <a href="#histoires" className="hover:opacity-60 transition">Histoires</a>
        </div>
        <div className="flex items-center gap-2">
          <MemberHubSheet trigger={
            <button className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full border-2 border-black hover:bg-black hover:text-white transition">
              <Sparkles className="w-3.5 h-3.5" /> Espace membre
            </button>
          } />
          <Link
            to="/auth"
            className="text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${MOOV}, ${VIOLET})` }}
          >
            Rejoindre
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-5 md:px-10 pt-12 md:pt-20 pb-20 overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: MOOV }} />
        <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: VIOLET }} />

        <div className="relative max-w-6xl mx-auto text-center">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase"
               style={{ background: `${MOOV}15`, color: MOOV_DARK }}>
            <Sparkles className="w-3.5 h-3.5" />
            La finance africaine, par les Africains
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl leading-[1.02] mb-6 font-black">
            Bâtir la <span style={{ color: MOOV }}>Richesse</span>
            <br />
            par la <span className="italic" style={{ color: VIOLET, fontFamily: "'DM Serif Display', serif" }}>Solidarité</span>
          </h1>
          <p className="max-w-2xl mx-auto text-base md:text-xl leading-relaxed text-black/70 mb-10">
            Se mettre ensemble pour créer de la richesse, bâtir des emplois, et nous protéger
            mutuellement. Chaque Moissonneur est un maillon d'une chaîne universelle de prospérité.
          </p>
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            <Link
              to="/auth"
              className="group flex items-center gap-2 text-white px-7 md:px-9 py-4 font-bold text-sm md:text-base uppercase tracking-wider rounded-full shadow-2xl hover:-translate-y-1 transition-all"
              style={{ background: `linear-gradient(135deg, ${MOOV}, ${MOOV_DARK})`, boxShadow: `0 20px 40px -10px ${MOOV}80` }}
            >
              Devenir Moissonneur
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
            <Link
              to="/packs"
              className="border-2 px-7 md:px-9 py-4 font-bold text-sm md:text-base uppercase tracking-wider rounded-full hover:bg-black hover:text-white transition-all"
              style={{ borderColor: NOIR, color: NOIR }}
            >
              Découvrir les Packs
            </Link>
            <MemberHubSheet />
          </div>

          {/* Bouton flottant Espace Gestionnaire — visible partout */}
          <div className="fixed bottom-6 right-6 z-50 md:hidden">
            <MemberHubSheet />
          </div>

          {/* Stats glass */}
          <div className="mt-16 md:mt-20 grid grid-cols-3 max-w-3xl mx-auto rounded-3xl overflow-hidden shadow-2xl border border-black/5"
               style={{ background: `linear-gradient(135deg, ${MOOV}, ${VIOLET})` }}>
            {[
              { v: "10K+", l: "Moissonneurs" },
              { v: "5M", l: "FCFA versés" },
              { v: "20", l: "Niveaux" },
            ].map((s, i) => (
              <div key={s.l} className={`p-5 md:p-8 text-white ${i !== 0 ? "border-l border-white/20" : ""}`}>
                <div className="text-2xl md:text-5xl font-black">{s.v}</div>
                <div className="uppercase text-[9px] md:text-xs tracking-[0.15em] mt-1 md:mt-2 opacity-90">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* L'ESPRIT MOISSONNEUR */}
      <section id="esprit" className="bg-[#0A0A0A] text-white py-20 md:py-32 px-5 md:px-10 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-20"
             style={{ background: `radial-gradient(circle, ${VIOLET}, transparent)` }} />

        <div className="relative max-w-7xl mx-auto grid md:grid-cols-2 gap-14 md:gap-20 items-start">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-4" style={{ color: MOOV }}>
              Notre vision
            </div>
            <h2 className="text-4xl md:text-6xl mb-8 leading-tight font-black">
              L'Esprit <br />
              <span style={display} className="italic" >Moissonneur</span>
            </h2>
            <p className="text-base md:text-lg mb-10 text-white/70 leading-relaxed">
              Plus qu'un réseau : <strong style={{ color: MOOV }}>une famille</strong>. Nous nous serrons les
              coudes pour créer ensemble de la richesse, des opportunités, et nous protéger mutuellement.
            </p>
            <div className="space-y-6">
              {[
                { n: "01", color: MOOV, t: "Ensemble, on va plus loin", d: "Chaque pack acheté crée des revenus pour toute votre lignée jusqu'au 20ème niveau." },
                { n: "02", color: VIOLET, t: "Un filet de sécurité collectif", d: "Cagnotte commune, fonds Moissonneur : quand l'un de nous traverse une épreuve, la communauté répond présent." },
                { n: "03", color: "#FFFFFF", t: "L'opportunité pour tous", d: "Transport, immobilier, marketplace, entreprises — chacun trouve un levier pour générer ses revenus." },
              ].map((item) => (
                <div key={item.n} className="flex gap-5 items-start">
                  <span className="text-3xl md:text-4xl font-black flex-shrink-0" style={{ color: item.color }}>{item.n}</span>
                  <div>
                    <h4 className="font-bold text-lg md:text-xl mb-1.5">{item.t}</h4>
                    <p className="text-sm md:text-base text-white/60 leading-relaxed">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bento témoignages */}
          <div id="histoires" className="grid grid-cols-2 gap-3 md:gap-4">
            {STORIES.map((s, i) => (
              <div
                key={s.name}
                className={`p-5 md:p-7 rounded-2xl transition-all hover:-translate-y-1 ${
                  i === 0 ? "mt-0 md:mt-10" : i === 3 ? "-mt-4 md:-mt-10" : ""
                }`}
                style={{
                  background: s.color === NOIR ? "rgba(255,255,255,0.06)" : `${s.color}25`,
                  border: `1px solid ${s.color === NOIR ? "rgba(255,255,255,0.1)" : s.color}50`,
                }}
              >
                <p className="text-xs md:text-sm italic mb-4 md:mb-5 leading-relaxed text-white/90">
                  « {s.text} »
                </p>
                <p className="font-bold text-sm" style={{ color: s.color === NOIR ? "#FFF" : s.color === MOOV ? "#7CFFB0" : VIOLET_LIGHT }}>
                  {s.name}
                </p>
                <p className="text-[10px] uppercase tracking-widest opacity-60 mt-1">{s.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT REJOINDRE */}
      <section className="py-20 md:py-32 px-5 md:px-10 max-w-7xl mx-auto">
        <div className="text-center mb-14 md:mb-20">
          <div className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: VIOLET }}>
            Comment ça marche
          </div>
          <h2 className="text-4xl md:text-6xl mb-4 font-black">Rejoindre le Mouvement</h2>
          <div className="w-24 h-1 mx-auto rounded-full" style={{ background: `linear-gradient(90deg, ${MOOV}, ${VIOLET})` }} />
        </div>
        <div className="grid md:grid-cols-4 gap-4 md:gap-6">
          {[
            { n: 1, c: MOOV, t: "Inscription Gratuite", d: "Créez votre compte. Recevez votre code MSN unique et rejoignez la communauté.", Icon: Sprout },
            { n: 2, c: VIOLET, t: "Bâtissez l'Équipe", d: "Invitez vos proches. Formez un réseau puissant qui crée de la valeur pour tous.", Icon: Users },
            { n: 3, c: NOIR, t: "Générez la Richesse", d: "Achetez des packs, vendez vos produits. Chaque action profite à toute votre lignée.", Icon: TrendingUp },
            { n: 4, c: MOOV_DARK, t: "Protection Mutuelle", d: "Entraidez-vous via la cagnotte commune. Le collectif vous protège dans l'épreuve.", Icon: Shield },
          ].map(({ n, c, t, d, Icon }) => (
            <div key={n} className="relative p-6 md:p-8 rounded-2xl border-2 border-black/5 hover:border-black/20 hover:-translate-y-2 transition-all bg-white shadow-sm hover:shadow-2xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl text-white flex items-center justify-center font-black text-lg" style={{ background: c }}>
                  {n}
                </div>
                <Icon className="w-6 h-6" style={{ color: c }} />
              </div>
              <h3 className="text-lg md:text-xl font-black mb-2">{t}</h3>
              <p className="text-sm text-black/60 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ÉCOSYSTÈME */}
      <section id="ecosysteme" className="py-20 md:py-32 px-5 md:px-10 relative overflow-hidden"
               style={{ background: `linear-gradient(180deg, #FAFAFA 0%, white 100%)` }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-6">
            <div className="max-w-2xl">
              <div className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: MOOV }}>
                Notre écosystème
              </div>
              <h2 className="text-4xl md:text-6xl leading-tight font-black">
                Une plateforme,<br />
                <span style={display} className="italic" >mille opportunités</span>
              </h2>
            </div>
            <p className="text-black/70 text-base md:text-lg max-w-md">
              Bien plus qu'un réseau : un écosystème complet qui crée richesse, emplois et solidarité partagée.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {[
              { Icon: HeartHandshake, c: MOOV, t: "Entraide & Cagnotte", d: "Participez aux cagnottes communautaires. Aidez un Moissonneur en difficulté. La solidarité est notre force." },
              { Icon: TrendingUp, c: VIOLET, t: "Marketplace & Services", d: "Boutiques, transport, immobilier, billetterie, entreprises — un écosystème complet pour consommer ensemble." },
              { Icon: Wallet, c: NOIR, t: "Portefeuille MSN", d: "Gérez vos revenus en temps réel. Transférez par code MSN, payez vos achats, rechargez en sécurité." },
            ].map(({ Icon, c, t, d }) => (
              <div key={t} className="relative p-7 md:p-9 rounded-3xl overflow-hidden group cursor-pointer transition-all hover:-translate-y-2 hover:shadow-2xl"
                   style={{ background: c === NOIR ? NOIR : "white", color: c === NOIR ? "white" : NOIR, border: c === NOIR ? "none" : `2px solid ${c}20` }}>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full opacity-10 group-hover:opacity-20 transition" style={{ background: c }} />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6" style={{ background: c === NOIR ? `${MOOV}30` : `${c}15` }}>
                    <Icon className="w-7 h-7" style={{ color: c === NOIR ? MOOV : c }} />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black mb-3">{t}</h3>
                  <p className={`text-sm leading-relaxed ${c === NOIR ? "text-white/70" : "text-black/60"}`}>{d}</p>
                  <div className="h-1 w-12 mt-6 rounded-full group-hover:w-24 transition-all duration-500" style={{ background: c === NOIR ? MOOV : c }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-5 md:px-10 py-16 md:py-24">
        <div className="max-w-5xl mx-auto rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden"
             style={{ background: `linear-gradient(135deg, ${NOIR} 0%, ${VIOLET} 50%, ${MOOV} 100%)` }}>
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-30 bg-white" />
          <div className="relative">
            <h3 className="text-3xl md:text-5xl font-black mb-4">Prêt à récolter votre avenir ?</h3>
            <p className="text-white/80 mb-8 max-w-xl mx-auto text-sm md:text-base">
              Rejoignez plus de 10 000 Moissonneurs qui ont déjà choisi de bâtir ensemble.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold uppercase tracking-wider hover:scale-105 transition-all text-sm md:text-base"
            >
              Commencer maintenant
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0A0A0A] text-white pt-16 pb-8 px-5 md:px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="text-2xl md:text-3xl font-black mb-4">
              Les <span style={{ color: MOOV }}>Moissonneurs</span>
            </div>
            <p className="text-white/60 max-w-sm leading-relaxed text-sm">
              La finance africaine, réinventée par et pour la communauté. Rejoignez l'héritage
              et construisez votre avenir au sein d'une famille soudée.
            </p>
          </div>
          <div>
            <h5 className="font-bold uppercase tracking-[0.2em] text-xs mb-5" style={{ color: MOOV }}>Navigation</h5>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><a href="#esprit" className="hover:text-white">L'Esprit Moissonneur</a></li>
              <li><a href="#ecosysteme" className="hover:text-white">L'Écosystème</a></li>
              <li><Link to="/packs" className="hover:text-white">Les Packs</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold uppercase tracking-[0.2em] text-xs mb-5" style={{ color: VIOLET_LIGHT }}>Compte</h5>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li><Link to="/auth" className="hover:text-white">Connexion</Link></li>
              <li><Link to="/auth" className="hover:text-white">Inscription</Link></li>
              <li><Link to="/dashboard" className="hover:text-white">Tableau de bord</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-white/40">
          <p>© 2026 Les Moissonneurs · L'énergie du collectif</p>
          <div className="flex gap-6 font-bold">
            <a href="#" className="hover:text-white">Mentions Légales</a>
            <a href="#" className="hover:text-white">Confidentialité</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
