// Il controllo che tiene allineate le traduzioni: ogni dizionario deve
// avere esattamente le chiavi dell'italiano. Se qualcuno aggiunge una voce
// e dimentica una lingua, il progetto non compila invece di mostrare una
// stringa vuota a un utente.
import type { Dizionario } from "./dizionario";
import en from "./dizionari/en.json";
import fr from "./dizionari/fr.json";
import es from "./dizionari/es.json";
import de from "./dizionari/de.json";
import ru from "./dizionari/ru.json";

const _controlloCompletezza: Dizionario[] = [en, fr, es, de, ru];
void _controlloCompletezza;
