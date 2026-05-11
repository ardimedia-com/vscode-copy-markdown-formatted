---
title: Example
status: Draft
updated: 2026-05-11 17:00h
---

# Heading H1 — Hauptüberschrift

## Heading H2 — Unterüberschrift

### Heading H3

#### Heading H4

##### Heading H5

###### Heading H6

Dies ist ein **erster Paragraph** mit *kursiv*, **fett**, ***fett‑kursiv*** und etwas `inline code`. Hier folgt ein [Link auf example.com](https://example.com) sowie ein [Link mit Title](https://example.com "Mein Tooltip").

Ein zweiter Paragraph, um den Abstand zwischen Paragraphen zu prüfen. Hier kommen Umlaute: Ärger, Öl, Übung, schöne Grüsse aus Liechtenstein. Und ein Emoji: 🎉.

Ein dritter Paragraph mit einem manuellen
Zeilenumbruch (zwei Leerzeichen am Zeilenende) — sollte als weicher Umbruch erscheinen.

## Listen

### Unordered List (native bullets)

- Erster Eintrag
- Zweiter Eintrag mit **fett**
- Dritter Eintrag mit `code`
- Vierter Eintrag mit [Link](https://example.com)

### Ordered List

1. Erster Schritt
2. Zweiter Schritt
3. Dritter Schritt

### Ordered List mit benutzerdefiniertem Start

5. Fünfter Eintrag
6. Sechster Eintrag
7. Siebter Eintrag

### Task List

- [x] Erledigt
- [x] Auch erledigt
- [ ] Offen
- [ ] Noch offen

### Verschachtelte Listen

- Ebene 1 — Eintrag A
  - Ebene 2 — Sub‑Eintrag A.1
    - Ebene 3 — Sub‑Sub‑Eintrag A.1.a
    - Ebene 3 — Sub‑Sub‑Eintrag A.1.b
  - Ebene 2 — Sub‑Eintrag A.2
- Ebene 1 — Eintrag B mit Code‑Block:
  ```bash
  npm install
  npm run build
  ```
- Ebene 1 — Eintrag C

## Blockquotes

> Ein einzeiliges Zitat.

> Ein Zitat über mehrere Zeilen.
> Zweite Zeile des Zitats.
> Dritte Zeile mit **fett** und `code`.

## Inline Code

Verwende `npm install`, `dotnet build` oder `git commit -m "msg"`. HTML‑Entities in Inline‑Code: `<div>`, `<h1>`, `&amp;`.

## Code Blocks

### Ohne Sprachangabe

```
Plain text code block.
Zweite Zeile.

Vierte Zeile (dritte ist leer).
```

### TypeScript mit Syntax‑Highlighting

```typescript
import { useState } from 'react';

interface UserProps {
  name: string;
  age: number;
}

function Greeting({ name, age }: UserProps): JSX.Element {
  const [count, setCount] = useState(0);
  return <h1>Hello, {name}! You are {age} years old.</h1>;
}

const result = 42 + "hello";
```

### Bash

```bash
#!/bin/bash
# Build script
echo "Building..."
npm run build
if [ $? -eq 0 ]; then
  echo "Done."
fi
```

### C#

```csharp
public class UserService
{
    private readonly ILogger<UserService> _logger;

    public UserService(ILogger<UserService> logger)
    {
        _logger = logger;
    }

    public async Task<User> GetAsync(int id)
    {
        _logger.LogInformation("Fetching user {Id}", id);
        return await _repository.GetByIdAsync(id);
    }
}
```

### JSON

```json
{
  "name": "example",
  "version": "1.0.0",
  "active": true,
  "tags": ["alpha", "beta"]
}
```

## Tabellen

| Spalte A | Spalte B | Spalte C |
|----------|----------|----------|
| Wert 1   | Wert 2   | Wert 3   |
| Wert 4   | Wert 5   | Wert 6   |
| Wert 7   | Wert 8   | Wert 9   |

### Tabelle mit Ausrichtung

| Links | Mitte | Rechts |
|:------|:-----:|-------:|
| A     | B     | C      |
| 1     | 2     | 3      |

### Tabelle mit Inline‑Formatierung

| Element | Beschreibung | Status |
|---------|--------------|--------|
| `<h1>`  | **Heading 1** | OK |
| `<p>`   | *Paragraph*   | OK |
| `<table>` | Tabelle | [Doku](https://example.com) |

## Horizontale Linie

Text vor der Linie.

---

Text nach der Linie.

## Bilder

Externe URL:

![Beispielbild](https://placehold.co/200x80/png "Tooltip‑Text")

## Mischung

Ein Paragraph mit **fett**, *kursiv*, `code` und [Link](https://example.com) — gefolgt von einer Liste:

1. Erster Punkt mit `inline code`
2. Zweiter Punkt mit **fett**
3. Dritter Punkt mit einem Zitat:
   > Eingerücktes Zitat in einer Liste

Und ein abschliessender Paragraph mit Umlauten: Liechtenstein, Schöllkraut, Übergrösse — und einem letzten Code‑Block:

```
Ende.
```
