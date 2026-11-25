import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const AboutView: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="space-y-5 pb-10">
    <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#166534]">
      <ArrowLeft className="h-4 w-4" /> Tillbaka
    </button>
    <h1 className="font-display text-3xl font-bold text-[#112218]">Om Pubgolf Links</h1>

    <section className="space-y-3 rounded-3xl border border-[#112218]/10 bg-white p-5 text-sm leading-relaxed text-[#112218]/80 shadow-xs">
      <p>
        Pubgolf Links är pubgolf för hårdförare. Bygg en bana med så många barer du orkar, starta en runda,
        kalla in gänget och håll koll på scoren hål för hål – med bowlingfirande när någon sätter en birdie
        och fri fram för att hetsa den som ligger sist.
      </p>
      <h2 className="pt-2 font-display text-lg font-bold text-[#112218]">Så funkar det</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Varje pub är ett hål. Varje klunk räknas som ett slag.</li>
        <li>Varje hål har ett par (1–6 klunkar). Under par = birdie, eagle … Hela glaset i ett svep = hole-in-one.</li>
        <li>Hål kan ha egna regler – bryter man dem kan det bli straffslag.</li>
        <li>En bana är banguiden: barer, dryck, par och regler – 1 till 18 hål. Öppna banor syns för alla under Spela.</li>
        <li>Vill ni köra en bana i annan ordning? Kör baklänges när ni startar, eller låt rundans ägare byta plats på hålen bara för er runda.</li>
        <li>En runda är när ni spelar banan. Den som startar rundan får en privat kod att dela, kan lägga till spelare med spelar-ID och låsa rundan.</li>
        <li>Rundor du inte vill ska räknas kan du ta bort ur ditt HCP.</li>
        <li>Alla börjar på HCP 54. Sedan räknas det ut från dina bästa hela rundor (alla hål spelade), omräknat till 18 hål. Under 10 = singel, och då låses den vita tourpikén upp.</li>
        <li>Vinner du en runda (lägst score bland dem som spelat klart, minst två) får du en guldstjärna – större vid 5, 10 och 20 vinster.</li>
        <li>Gear låses upp när du spelar: putter, flaggstång, paraply, guldklubba (10 eagles), Claret Jug (vinst) och guldboll med antal hole-in-ones.</li>
        <li>Lägg till vänner direkt under Utforska. Lägger de till dig tillbaka blir ni vänner.</li>
      </ul>
      <h2 className="pt-2 font-display text-lg font-bold text-[#112218]">Ingen nåd</h2>
      <p>
        Lägst antal klunkar vinner. Den som släpar efter får höra det hela kvällen.
      </p>
    </section>

    <p className="text-center text-xs text-[#112218]/45">Byggt av ett kompisgäng i Stockholm · 2026</p>
  </div>
);
