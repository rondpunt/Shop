import { PageHeader } from "@/components/PageHeader";

const Privacy = () => {
  return (
    <div className="app-page-panel">
      <PageHeader title="Privacybeleid" subtitle="Welke gegevens Shop&Go gebruikt en waarom" />

      <div className="mt-6 space-y-4 px-2 text-sm leading-relaxed text-card-foreground">
        <p>
          Shop&Go Kortrijk is een persoonlijke parkeerhulp. We gebruiken alleen gegevens die nodig zijn voor
          parkeerfuncties, synchronisatie, beveiliging en functies die je zelf activeert. We verkopen geen
          persoonsgegevens en gebruiken je parkeerlocatie niet voor advertentiedoeleinden.
        </p>

        <h3 className="mt-6 text-base font-bold">1. Gebruik zonder account</h3>
        <p>
          Favorieten, instellingen, voertuigen en parkeersessies kunnen lokaal op je toestel worden bewaard.
          Lokale browser- of appopslag kan verdwijnen wanneer je de appgegevens wist of de app verwijdert.
        </p>

        <h3 className="mt-6 text-base font-bold">2. Account en cloudsynchronisatie</h3>
        <p>
          Wanneer je je aanmeldt, gebruikt Shop&Go Supabase voor authenticatie en synchronisatie. Daarbij kunnen
          je profielgegevens, voertuigen, nummerplaat, parkeerhistoriek, notities en de locatie van een door jou
          gestarte parkeersessie worden opgeslagen. Toegang tot persoonlijke tabellen is per gebruiker afgeschermd.
        </p>

        <h3 className="mt-6 text-base font-bold">3. Locatie</h3>
        <p>
          Met jouw toestemming leest de app je precieze of benaderde locatie om Shop&Go-plaatsen in de buurt te
          tonen, afstanden te berekenen en een parkeersessie aan een locatie te koppelen. Bij een aangemeld account
          kan de locatie van een gestarte sessie in je eigen cloudhistoriek worden bewaard. Je huidige GPS-locatie
          wordt niet continu op de achtergrond gevolgd.
        </p>

        <h3 className="mt-6 text-base font-bold">4. Communitysignalen</h3>
        <p>
          Als je een communitymelding deelt of een parkingtimer gebruikt, kan de app geanonimiseerde signalen
          afleiden zoals “recent vrij”, “bezet” of “mogelijk vrij binnen enkele minuten”. Publieke functies geven
          geen gebruikers-ID, nummerplaat of persoonlijke sessiegegevens door. Een signaal is nooit een reservatie
          of garantie dat een plaats vrij blijft.
        </p>

        <h3 className="mt-6 text-base font-bold">5. Externe diensten</h3>
        <p>
          De app gebruikt Google Maps voor kaartweergave en navigatie, Parko voor actuele Shop&Go-sensordata,
          Supabase voor account- en databasefuncties en Vercel voor de webapp en beveiligde API-functies. De
          web/PWA-versie kan Stripe gebruiken voor Premium-betalingen. Android Store-versies gebruiken de
          betalingsmethode van de betreffende appwinkel wanneer aankopen daar worden aangeboden.
        </p>

        <h3 className="mt-6 text-base font-bold">6. AI-parkeerassistent</h3>
        <p>
          De AI-parkeerassistent is optioneel en vereist een aangemeld account. Alleen de tekst die je naar de
          assistent stuurt en beperkte recente gesprekscontext worden voor het beantwoorden van die vraag naar de
          geconfigureerde AI-dienst gestuurd. API-sleutels blijven op de server en worden niet naar je toestel
          meegestuurd.
        </p>

        <h3 className="mt-6 text-base font-bold">7. Meldingen en foto’s</h3>
        <p>
          Timerwaarschuwingen worden alleen ingeschakeld na toestemming. Een sessiefoto wordt alleen verwerkt als
          je zelf een foto toevoegt; cloudfoto’s worden in een afgeschermde gebruikersmap bewaard.
        </p>

        <h3 className="mt-6 text-base font-bold">8. Bewaren, verwijderen en beveiliging</h3>
        <p>
          Persoonlijke cloudgegevens blijven gekoppeld aan je account zolang ze nodig zijn voor de functies die je
          gebruikt of tot je ze verwijdert. We gebruiken toegangsregels op databaseniveau, versleutelde HTTPS-
          verbindingen en server-only secrets. Een app kan nooit absolute veiligheid garanderen; beveiligingsupdates
          worden daarom doorlopend toegepast.
        </p>

        <h3 className="mt-6 text-base font-bold">9. Contact</h3>
        <p>
          Voor vragen over privacy, inzage of verwijdering kun je de supportmogelijkheid in Shop&Go gebruiken.
          Voor een publieke store-release moet in de winkellijst ook een geldig support- en privacycontact worden
          ingevuld.
        </p>

        <p className="pb-4 pt-2 text-xs text-muted-foreground">Laatst bijgewerkt: 15 augustus 2026.</p>
      </div>
    </div>
  );
};

export default Privacy;
