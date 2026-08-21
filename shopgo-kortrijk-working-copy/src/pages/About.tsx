import { PageHeader } from "@/components/PageHeader";

const About = () => {
  return (
    <div className="app-page-panel">
      <PageHeader title="Over Shop&Go" subtitle="Informatie over deze app" />
      
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-card-foreground px-2">
        <p>
          Shop&Go Kortrijk helpt je bij het vinden van de beste Shop&Go parkeerplaatsen in de stad. Deze app maakt gebruik van open data van stad Kortrijk (Parko) om actuele bezettingsinformatie weer te geven.
        </p>
        
        <p>
          Met de Shop&Go plaatsen in Kortrijk kan je gedurende 30 minuten gratis en slim parkeren om snel een boodschap te doen. Sensoren in de grond registreren je aankomst en vertrek. Je hoeft geen ticket te nemen of sms te sturen.
        </p>
        
        <p className="font-semibold mt-4">
          Disclaimer
        </p>
        <p className="text-muted-foreground text-xs">
          Deze applicatie is een onafhankelijk project en is niet officieel verbonden aan Parko of Stad Kortrijk. De app is bedoeld als handig hulpmiddel. We proberen de data zo accuraat mogelijk weer te geven, maar er kunnen geen rechten aan worden ontleend. Kijk altijd naar de actuele signalisatie op straat.
        </p>
      </div>
    </div>
  );
};

export default About;
