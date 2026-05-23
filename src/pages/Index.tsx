import { Link } from "react-router-dom";
import { Sprout, Users, Shield, TrendingUp, HeartHandshake, Wallet } from "lucide-react";

const serif = { fontFamily: "'DM Serif Display', serif" };
const sans = { fontFamily: "'Fira Sans', sans-serif" };

const STORIES = [
  {
    name: "Awa, 34 ans",
    role: "Maman entrepreneur",
    text: "Grâce aux Moissonneurs, j'ai pu ouvrir mon petit commerce et payer l'école de mes trois enfants. Aujourd'hui, j'aide à mon tour d'autres femmes à se lancer.",
    accent: true,
  },
  {
    name: "Ibrahim, 27 ans",
    role: "Étudiant devenu mentor",
    text: "J'ai commencé avec zéro franc. En invitant mes amis, j'ai bâti une équipe de 60 personnes. Mes commissions financent mes études jusqu'au doctorat.",
  },
  {
    name: "Famille Koné",
    role: "Solidarité villageoise",
    text: "Quand mon père est tombé malade, la cagnotte des Moissonneurs et le fonds commun ont couvert les frais d'hospitalisation. On n'était plus seuls dans l'épreuve.",
  },
  {
    name: "Marie, 41 ans",
    role: "Propriétaire MSN Immo",
    text: "J'ai mis ma chambre en location via MSN Immo. En 6 mois, j'ai assez économisé pour acheter un nouveau terrain. La communauté me dépasse.",
    accent: true,
  },
];

const Index = () => {
  return (
    <div style={sans} className="w-full bg-[#f5f0e0] text-[#064e3b] overflow-x-hidden selection:bg-[#c9a84c] selection:text-white">
      {/* NAV */}
      <nav className="px-6 md:px-10 py-5 flex justify-between items-center border-b border-[#064e3b]/10 bg-[#f5f0e0]/95 backdrop-blur sticky top-0 z-50">
        <Link to="/" className="text-xl md:text-2xl font-bold tracking-tight" style={serif}>
          Les <span className="text-[#c9a84c]">Moissonneurs</span>
        </Link>
        <div className="hidden md:flex gap-8 text-xs font-medium uppercase tracking-[0.2em]">
          <a href="#esprit" className="hover:text-[#c9a84c] transition-colors">L'Esprit</a>
          <a href="#ecosysteme" className="hover:text-[#c9a84c] transition-colors">Écosystème</a>
          <a href="#commissions" className="hover:text-[#c9a84c] transition-colors">Commissions</a>
          <a href="#histoires" className="hover:text-[#c9a84c] transition-colors">Histoires</a>
        </div>
        <Link to="/auth" className="bg-[#064e3b] text-[#f5f0e0] px-5 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-[#0d7a5f] transition-all">
          Connexion
        </Link>
      </nav>

      {/* HERO */}
      <section className="relative px-6 md:px-10 pt-16 md:pt-24 pb-24 max-w-7xl mx-auto text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c9a84c] text-[#c9a84c] text-[10px] md:text-xs font-bold tracking-[0.25em] uppercase">
          <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse"></span>
          Ensemble, nous récoltons l'avenir
        </div>
        <h1 className="text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-8" style={serif}>
          Bâtir la Richesse <br />
          par la <span className="italic text-[#c9a84c]">Solidarité</span>
        </h1>
        <p className="max-w-2xl mx-auto text-lg md:text-xl leading-relaxed text-[#064e3b]/80 mb-12">
          Notre vision est simple mais puissante : se mettre ensemble pour créer de la richesse,
          bâtir des emplois et nous protéger mutuellement. Chaque Moissonneur est un maillon
          essentiel d'une chaîne universelle de prospérité.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/auth" className="bg-[#064e3b] text-[#f5f0e0] px-8 md:px-10 py-4 font-bold text-sm md:text-base uppercase tracking-wider hover:shadow-2xl hover:-translate-y-1 transition-all border-b-4 border-[#0d7a5f]">
            Devenir Moissonneur
          </Link>
          <Link to="/packs" className="border-2 border-[#064e3b] text-[#064e3b] px-8 md:px-10 py-4 font-bold text-sm md:text-base uppercase tracking-wider hover:bg-[#064e3b] hover:text-[#f5f0e0] transition-all">
            Découvrir les Packs
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 w-full grid grid-cols-1 md:grid-cols-3 bg-white/60 backdrop-blur-sm border border-[#064e3b]/10 shadow-xl">
          <div className="p-8 md:p-10">
            <div className="text-3xl md:text-5xl text-[#c9a84c]" style={serif}>10 000+</div>
            <div className="uppercase text-[10px] md:text-xs tracking-[0.2em] mt-2 opacity-70">Moissonneurs Actifs</div>
          </div>
          <div className="p-8 md:p-10 md:border-x border-y md:border-y-0 border-[#064e3b]/10">
            <div className="text-3xl md:text-5xl text-[#c9a84c]" style={serif}>5M FCFA</div>
            <div className="uppercase text-[10px] md:text-xs tracking-[0.2em] mt-2 opacity-70">Commissions Versées</div>
          </div>
          <div className="p-8 md:p-10">
            <div className="text-3xl md:text-5xl text-[#c9a84c]" style={serif}>20 Niveaux</div>
            <div className="uppercase text-[10px] md:text-xs tracking-[0.2em] mt-2 opacity-70">Profondeur de Réseau</div>
          </div>
        </div>
      </section>

      {/* L'ESPRIT MOISSONNEUR */}
      <section id="esprit" className="bg-[#064e3b] text-[#f5f0e0] py-24 md:py-32 px-6 md:px-10 overflow-hidden">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 md:gap-20 items-center">
          <div className="relative">
            <div className="absolute -top-10 -left-4 md:-left-10 text-[150px] md:text-[200px] font-bold text-[#f5f0e0]/5 leading-none select-none pointer-events-none" style={serif}>“</div>
            <h2 className="text-4xl md:text-6xl mb-8 leading-tight relative" style={serif}>
              L'Esprit <br />
              <span className="text-[#c9a84c]">Moissonneur</span>
            </h2>
            <p className="text-base md:text-lg mb-10 text-[#f5f0e0]/80 leading-relaxed">
              Plus qu'un réseau : <strong className="text-[#c9a84c]">une famille</strong>. Nous nous serrons les coudes pour créer
              ensemble de la richesse, des opportunités, et nous protéger mutuellement.
              Chaque Moissonneur est un maillon d'une chaîne de solidarité.
            </p>
            <div className="space-y-8">
              {[
                { n: "01", title: "Ensemble, on va plus loin", body: "En achetant un pack, vous créez des revenus pour vous et pour toute votre lignée jusqu'au 20ème niveau." },
                { n: "02", title: "Un filet de sécurité collectif", body: "Cagnotte commune, fonds Moissonneur : quand l'un de nous traverse une épreuve, la communauté répond présent." },
                { n: "03", title: "L'opportunité pour tous", body: "Transport, immobilier, marketplace, entreprises — chacun trouve un levier pour générer ses propres revenus." },
              ].map((item) => (
                <div key={item.n} className="flex gap-6 items-start">
                  <span className="text-[#c9a84c] text-2xl md:text-3xl flex-shrink-0" style={serif}>{item.n}</span>
                  <div>
                    <h4 className="font-bold text-lg md:text-xl mb-2">{item.title}</h4>
                    <p className="text-sm md:text-base text-[#f5f0e0]/60 leading-relaxed">{item.body}</p>
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
                className={`p-5 md:p-8 transition-all group ${
                  s.accent
                    ? "bg-[#0d7a5f] hover:bg-[#c9a84c]"
                    : "bg-white/10 hover:bg-white/20"
                } ${i === 0 ? "mt-0 md:mt-12" : ""} ${i === 3 ? "-mt-4 md:-mt-12" : ""}`}
              >
                <p className={`text-xs md:text-sm italic mb-4 md:mb-6 leading-relaxed ${
                  s.accent ? "group-hover:text-[#064e3b]" : ""
                }`}>
                  “{s.text}”
                </p>
                <p className={`font-bold text-sm ${s.accent ? "group-hover:text-[#064e3b]" : ""}`}>{s.name}</p>
                <p className={`text-[10px] md:text-xs uppercase tracking-widest opacity-60 ${
                  s.accent ? "group-hover:text-[#064e3b]/70" : ""
                }`}>{s.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMENT REJOINDRE */}
      <section className="py-24 md:py-32 px-6 md:px-10 max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-4xl md:text-6xl mb-4" style={serif}>Rejoindre le Mouvement</h2>
          <div className="w-24 h-[2px] bg-[#c9a84c] mx-auto mb-6"></div>
          <p className="text-[#064e3b]/60 uppercase tracking-[0.25em] text-xs font-bold">
            4 étapes pour transformer votre vie
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-px bg-[#064e3b]/10">
          {[
            { n: 1, c: "#064e3b", t: "Inscription Gratuite", d: "Créez votre compte Moissonneur. Recevez votre code MSN unique et rejoignez une communauté de bâtisseurs.", Icon: Sprout },
            { n: 2, c: "#0d7a5f", t: "Bâtissez l'Équipe", d: "Invitez vos proches à rejoindre le mouvement. Ensemble, formez un réseau puissant qui crée de la valeur pour tous.", Icon: Users },
            { n: 3, c: "#c9a84c", t: "Générez la Richesse", d: "Achetez des packs, initiez des commandes, vendez vos produits. Chaque action profite à toute votre lignée.", Icon: TrendingUp },
            { n: 4, c: "#064e3b", t: "Protection Mutuelle", d: "Entraidez-vous via la cagnotte commune. La force du collectif vous protège dans les moments difficiles.", Icon: Shield },
          ].map(({ n, c, t, d, Icon }) => (
            <div key={n} className="bg-[#f5f0e0] p-8 md:p-10 hover:bg-white transition-colors">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full text-white flex items-center justify-center font-bold" style={{ backgroundColor: c, fontFamily: "'DM Serif Display', serif" }}>
                  {n}
                </div>
                <Icon className="w-5 h-5 text-[#c9a84c]" />
              </div>
              <h3 className="text-lg md:text-xl font-bold mb-3 uppercase tracking-tight">{t}</h3>
              <p className="text-sm text-[#064e3b]/70 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ÉCOSYSTÈME */}
      <section id="ecosysteme" className="bg-white py-24 md:py-32 px-6 md:px-10 border-y border-[#c9a84c]/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-6xl mb-4 leading-tight" style={serif}>Un Écosystème <br /><span className="italic text-[#0d7a5f]">de Prospérité</span></h2>
              <p className="text-[#064e3b]/70 text-base md:text-lg mt-4">
                Bien plus qu'un réseau : une communauté qui crée richesse, emplois et solidarité partagée.
              </p>
            </div>
            <div className="hidden md:flex w-32 h-32 border-2 border-[#c9a84c] rounded-full items-center justify-center text-[#c9a84c] text-[10px] uppercase tracking-[0.25em] text-center p-6" style={serif}>
              Solidarité Collective
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { Icon: HeartHandshake, t: "Entraide & Cagnotte", d: "Participez aux cagnottes communautaires. Aidez un Moissonneur en difficulté. La solidarité est notre force première." },
              { Icon: TrendingUp, t: "Marketplace & Services", d: "Boutiques en ligne, transport, immobilier, billetterie, entreprises — un écosystème complet pour consommer ensemble." },
              { Icon: Wallet, t: "Portefeuille MSN", d: "Gérez vos revenus en temps réel. Transférez par code MSN, payez vos achats, rechargez et retirez en toute sécurité." },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="p-8 md:p-10 border border-[#064e3b]/10 hover:border-[#c9a84c] transition-all group">
                <div className="text-[#c9a84c] mb-6">
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl md:text-2xl mb-4" style={serif}>{t}</h3>
                <p className="text-sm text-[#064e3b]/70 leading-relaxed mb-6">{d}</p>
                <div className="h-[2px] w-12 bg-[#c9a84c] group-hover:w-full transition-all duration-500"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMMISSIONS */}
      <section id="commissions" className="bg-[#f5f0e0] py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-4xl mx-auto border-2 border-[#064e3b] p-8 md:p-16 relative bg-[#f5f0e0]">
          <div className="absolute -top-5 left-8 md:left-12 bg-[#f5f0e0] px-4 md:px-6 text-2xl md:text-3xl" style={serif}>
            Plan de Commissions
          </div>
          <p className="mb-10 text-[#064e3b]/70 mt-2 text-sm md:text-base">
            Gagnez jusqu'à <strong>20 niveaux de profondeur</strong> avec des commissions calculées sur
            le bénéfice de chaque pack acheté par vos filleuls. Le taux du niveau 1 est défini par
            l'administrateur, puis décroît jusqu'à l'infini.
          </p>

          <div className="space-y-5">
            {[
              { l: "Niveau 1 (Direct)", p: "30%" },
              { l: "Niveau 2", p: "26%" },
              { l: "Niveau 3", p: "22%" },
              { l: "Niveau 4", p: "18%" },
              { l: "Niveau 5", p: "15%" },
              { l: "Niveaux 6 → 20", p: "Décroissants" },
            ].map((row) => (
              <div key={row.l} className="flex items-center justify-between gap-4">
                <span className="font-bold text-sm md:text-base">{row.l}</span>
                <div className="flex-1 border-b border-dotted border-[#064e3b]/20"></div>
                <span className="text-xl md:text-2xl text-[#c9a84c]" style={serif}>{row.p}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-[#064e3b] text-[#f5f0e0] p-6 md:p-8 text-center">
            <h4 className="text-lg md:text-xl mb-2 underline decoration-[#c9a84c] underline-offset-4" style={serif}>Le Défi Collectif</h4>
            <p className="text-xs md:text-sm opacity-80 mb-6">
              Rejoignez plus de 10 000 Moissonneurs qui ont déjà choisi de bâtir ensemble.
            </p>
            <Link to="/auth" className="inline-block bg-[#c9a84c] text-[#064e3b] px-6 md:px-8 py-3 font-bold uppercase tracking-wider hover:bg-white transition-colors text-xs md:text-sm">
              Relever le Défi Maintenant
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#064e3b] text-[#f5f0e0] pt-20 pb-10 px-6 md:px-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="text-2xl md:text-3xl mb-6" style={serif}>
              Les <span className="text-[#c9a84c]">Moissonneurs</span>
            </div>
            <p className="text-[#f5f0e0]/60 max-w-sm leading-relaxed text-sm italic">
              Depuis les âges anciens, guidant des civilisations vers la prospérité.
              Rejoignez l'héritage et construisez votre avenir au sein d'une communauté soudée.
            </p>
          </div>
          <div>
            <h5 className="font-bold uppercase tracking-[0.2em] text-xs mb-6 text-[#c9a84c]">Navigation</h5>
            <ul className="space-y-3 text-sm opacity-80">
              <li><a href="#esprit" className="hover:text-[#c9a84c]">L'Esprit Moissonneur</a></li>
              <li><a href="#ecosysteme" className="hover:text-[#c9a84c]">L'Écosystème</a></li>
              <li><a href="#commissions" className="hover:text-[#c9a84c]">Commissions</a></li>
              <li><Link to="/packs" className="hover:text-[#c9a84c]">Les Packs</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold uppercase tracking-[0.2em] text-xs mb-6 text-[#c9a84c]">Compte</h5>
            <ul className="space-y-3 text-sm opacity-80">
              <li><Link to="/auth" className="hover:text-[#c9a84c]">Connexion</Link></li>
              <li><Link to="/auth" className="hover:text-[#c9a84c]">Inscription</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#c9a84c]">Tableau de bord</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-[#f5f0e0]/10 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] uppercase tracking-[0.2em] opacity-50">
          <p>© 2026 Les Moissonneurs · L'énergie du collectif.</p>
          <div className="flex gap-6 font-bold">
            <a href="#" className="hover:text-[#c9a84c]">Mentions Légales</a>
            <a href="#" className="hover:text-[#c9a84c]">Confidentialité</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
