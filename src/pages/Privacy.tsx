import { PageHeader } from "@/components/PageHeader";

const Privacy = () => {
  return (
    <div className="app-page-panel">
      <PageHeader title="Privacybeleid" subtitle="Hoe we met je data omgaan" />
      
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-card-foreground px-2">
        <p>
          We nemen je privacy serieus. In dit beleid leggen we uit welke gegevens we verzamelen en wat we ermee doen.
        </p>
        
        <h3 className="text-base font-bold mt-6 mb-2">1. Lokale opslag</h3>
        <p>
          De applicatie slaat basisgegevens zoals je favoriete locaties, actieve parkeersessies en instellingen lokaal op je toestel op (bijvoorbeeld in localStorage of lokale IndexedDB/SQLite opslag).
        </p>
        
        <h3 className="text-base font-bold mt-6 mb-2">2. Cloud synchronisatie (Premium)</h3>
        <p>
          Indien je een account aanmaakt voor het Premium abonnement, slaan we gegevens zoals je nummerplaat en sessiegeschiedenis op in onze beveiligde clouddatabase om deze over verschillende toestellen te kunnen synchroniseren.
        </p>

        <h3 className="text-base font-bold mt-6 mb-2">3. Locatiegegevens</h3>
        <p>
          De app kan, na jouw toestemming, je huidige locatie opvragen om parkeerplaatsen in de buurt te tonen en om je te herinneren als je je wagen achterlaat. Deze locatiegegevens worden enkel op je eigen toestel gebruikt of tijdelijk doorgestuurd naar de kaartdiensten (zoals Google Maps) om routes te berekenen, maar ze worden niet structureel door ons bewaard of gedeeld met derden voor advertentiedoeleinden.
        </p>
        
        <h3 className="text-base font-bold mt-6 mb-2">4. Contact</h3>
        <p>
          Heb je vragen over je gegevens of dit privacybeleid? Neem dan contact met ons op via de support kanalen.
        </p>
      </div>
    </div>
  );
};

export default Privacy;
