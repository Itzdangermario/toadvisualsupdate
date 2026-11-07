# Toad's Visuals – Updates

Hier werden neue Versionen von **Toad's Visuals V2** als GitHub-Releases veröffentlicht.
Das **Update Center** in der Mod fragt beim Start von Minecraft einmal hier nach und zeigt eine Benachrichtigung,
wenn es eine neuere Version gibt. Nichts startet ohne Klick des Spielers:

- **Herunterladen & installieren**: lädt die JAR für die Minecraft-Version des Spielers aus dem Release, prüft sie
  (SHA-256-Prüfsumme von GitHub, Mod-ID, Version, Minecraft- und Fabric-Version) und tauscht sie beim Schließen von
  Minecraft aus – mit Sicherung der alten JAR; bei einem Fehler bleibt die alte Version. Andere Mods werden nie angefasst.
- **Update herunterladen**: öffnet nur die Release-Seite im Browser.

## Was die Mod liest

- `https://api.github.com/repos/Itzdangermario/toadvisualsupdate/releases` (öffentlich, ohne Anmeldung)
- **Entwürfe** sieht die Mod nie.
- **Pre-Releases (Testversionen)** sieht nur, wer im Update Center „Testversionen anzeigen“ eingeschaltet hat.
- Angezeigt wird ein Release nur, wenn seine Version **höher als die installierte** ist und eine JAR für die
  Minecraft-Version des Spielers dranhängt (`ToadsVisuals-<Version>+<Minecraft>.jar`).

**Wichtig:** Das Repository muss **öffentlich** sein, sonst sieht die Mod keine Releases.

## Neue Version veröffentlichen

1. **Entwurf anlegen:** *Actions* → **Release vorbereiten (Entwurf)** → *Run workflow* → Versionsnummer eingeben
   (z. B. `2.0.1`) → *Run workflow*.
   Der Workflow prüft, dass die Nummer gültig, noch nicht vergeben und höher als alle veröffentlichten ist, und legt
   einen **Entwurf** an. Spieler sehen davon nichts.
2. **JARs anhängen:** *Releases* → beim Entwurf auf den Stift → alle JARs (eine pro Minecraft-Version, z. B.
   `ToadsVisuals-2.0.1+1.21.11.jar`) in das Feld *Attach binaries* ziehen → Notizen ausfüllen (das zeigt die Mod bei
   „Was ist neu?“).
3. **Freigeben:** erst wenn alles stimmt, **Publish release** klicken. Das ist deine Freigabe – vorher sieht niemand
   etwas.
4. Automatisch prüft danach **Release prüfen**: richtige Version in den JARs, SHA-256-Prüfsumme von GitHub vorhanden
   und passend, höher als alles Bisherige, Testversion als Pre-Release markiert. Stimmt etwas nicht, wird der Release sofort wieder zum Entwurf (Grund unter *Actions*).

## Testversion (normale Spieler merken nichts)

- Versionsnummer mit `-test.<Nummer>`, z. B. `2.0.1-test.1`, und beim Workflow **Testversion** anhaken.
- Die JARs müssen genau diese Version haben (`ToadsVisuals-2.0.1-test.1+1.21.11.jar`).
- Sie wird als **Pre-Release** veröffentlicht: nur wer im Update Center „Testversionen anzeigen“ einschaltet, bekommt
  die Benachrichtigung.
- Zurückziehen: Release öffnen → Stift → **Delete** (oder wieder als Entwurf speichern).

## Regeln

- Nichts wird automatisch veröffentlicht – nur dein Klick auf *Publish release*.
- Vorhandene Versionen werden nie überschrieben: eine Nummer, die es schon gibt (auch als Entwurf), lehnt der Workflow ab.
- Jede neue Version muss höher sein als alle veröffentlichten (`2.0.0` → `2.0.1` → `2.0.2` …).

## Dateien

- `.github/workflows/release-vorbereiten.yml` – legt einen Entwurf an (manuell gestartet)
- `.github/workflows/release-pruefen.yml` – prüft jeden veröffentlichten Release
- `scripts/pruefe-release.mjs` – die Prüfungen (Node, ohne Abhängigkeiten)
- `VORLAGE-RELEASE-NOTIZEN.md` – Vorlage für die Notizen eines neuen Releases
