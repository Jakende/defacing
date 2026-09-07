# Website-Meta & Branding – Vollständige Anleitung

Alles, was eine Website braucht, damit sie in Browsertabs, Suchmaschinen, Social Media und Messengern professionell auftritt.

---

## 1. Favicon

Das kleine Icon im Browsertab, in Lesezeichen und im Verlauf.

### SVG-Favicon (empfohlen, modern)

SVG ist vektorbasiert, unendlich scharf, per CSS anpassbar (z.B. Dark Mode) und braucht keine zusätzlichen Tools.

**Erstellen im Terminal:**

```bash
cat > favicon.svg << 'EOF'

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">

  <rect width="100" height="100" rx="15" fill="#2d2d2d"/>

  <text x="50" y="72" text-anchor="middle" font-size="70" font-family="sans-serif" font-weight="bold" fill="#ffffff">V</text>

</svg>

EOF
```

**Einbinden im `<head>:**

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```

**ICO-Favicon (Legacy)**

Container-Format mit mehreren Pixelgrößen (16×16, 32×32, 48×48). Nur nötig für sehr alte Browser.

**Erstellen mit ImageMagick:**

```bash
brew install imagemagick

convert favicon.png \

  \( -clone 0 -resize 16x16 \) \

  \( -clone 0 -resize 32x32 \) \

  \( -clone 0 -resize 48x48 \) \

  -delete 0 favicon.ico
```

**Einbinden im `<head>`:**

```html
<link rel="icon" href="/favicon.ico" type="image/x-icon">
```

**Vergleich SVG vs. ICO**

|               |SVG                     |ICO                         |
|---------------|------------------------|----------------------------|
|Skalierung     |Vektor, unendlich scharf|Pixel, feste Größen         |
|Dateigröße     |Meist kleiner           |Größer (mehrere Bitmaps)    |
|Editierbar     |Ja, im Texteditor       |Nein, braucht Grafikprogramm|
|Dark Mode      |Kann per CSS reagieren  |Nicht möglich               |
|Browser-Support|Alle modernen Browser   |Alle inkl. alte             |


## 2. Social Preview (Open Graph)

Das Vorschaubild und der Text beim Teilen auf WhatsApp, LinkedIn, X/Twitter, Slack, Discord etc.

**Bild erstellen**

- Größe: 1200 × 630 px

- Format: PNG oder JPG

- Tools: Figma, Canva, Google Slides

- Dateiname: z.B. ‎`og-image.png` im Root-Verzeichnis

- Wichtig: Pfad muss vollständige URL sein (‎`https://domain.de/og-image.png`)

**Open Graph Meta-Tags**

```html
<meta property="og:title" content="verplant – Plattform für Planer*innen">

<meta property="og:description" content="Kommunikation und Vernetzung für angehende und praktizierende Planer:innen.">

<meta property="og:image" content="https://verplant.io/og-image.png">

<meta property="og:url" content="https://verplant.io">

<meta property="og:type" content="website">

<meta property="og:site_name" content="verplant">

```

**Twitter/X Meta-Tags**

```html
<meta name="twitter:card" content="summary_large_image">

<meta name="twitter:title" content="verplant – Plattform für Planer*innen">

<meta name="twitter:description" content="Kommunikation und Vernetzung für angehende und praktizierende Planer:innen.">

<meta name="twitter:image" content="https://verplant.io/og-image.png">
```

## 3. SEO & Meta Description

```html
<meta name="description" content="Kommunikation und Vernetzung für angehende und praktizierende Planer:innen – über disziplinäre Grenzen hinweg.">

<meta property="og:site_name" content="verplant">
```

## 4. Vollständiges `<head>`-Template

```html
  <head>

  <meta charset="UTF-8">

  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>verplant – Plattform für Planer*innen</title>

  <!-- SEO -->

  <meta name="description" content="Kommunikation und Vernetzung für angehende und praktizierende Planer:innen – über disziplinäre Grenzen hinweg.">

  <!-- Favicon -->

  <link rel="icon" href="/favicon.svg" type="image/svg+xml">

  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

  <!-- Open Graph -->

  <meta property="og:title" content="verplant – Plattform für Planer*innen">

  <meta property="og:description" content="Kommunikation und Vernetzung für angehende und praktizierende Planer:innen.">

  <meta property="og:image" content="https://verplant.io/og-image.png">

  <meta property="og:url" content="https://verplant.io">

  <meta property="og:type" content="website">

  <meta property="og:site_name" content="verplant">

  <!-- Twitter/X -->

  <meta name="twitter:card" content="summary_large_image">

  <meta name="twitter:title" content="verplant – Plattform für Planer*innen">

  <meta name="twitter:description" content="Kommunikation und Vernetzung für angehende und praktizierende Planer:innen.">

  <meta name="twitter:image" content="https://verplant.io/og-image.png">

</head>
```

## 5. Testen & Validieren

|Plattform|Tool                               |
|---------|-----------------------------------|
|Allgemein|opengraph.xyz                      |
|LinkedIn |linkedin.com/post-inspector        |
|X/Twitter|cards-dev.x.com/validator          |
|Facebook |developers.facebook.com/tools/debug|

6. Checkliste

- favicon.svg erstellt und im Root abgelegt

- `<link rel="icon">` im `<head>`` eingebunden

- og-image.png erstellt (1200 × 630 px) und hochgeladen

- Open Graph Meta-Tags im `<head>`

- Twitter Meta-Tags im `<head>`

- `<meta name="description">` vorhanden

- `og:site_name` gesetzt

- Mit opengraph.xyz getestet

- Auf verschiedenen Plattformen Vorschau geprüft



## Verbindliches Deface-Branding

- Das Deface-Zeichen ist ein monochromes 3×3-Pixelraster aus neun Quadraten. Geometrische Quelle: `branding/logo.svg` (44×44; Quadrate 12×12; Abstand 4).
- Dieses Zeichen steht links neben der Wortmarke DEFACE und über der Wortmarke in der Startup-Animation. Dort bauen sich die neun Pixel zeitlich versetzt auf; die bestehende Dauer und reduzierte Bewegung bleiben erhalten.
- Website-Favicon, Apple-Touch-Icon und PWA-Icons verwenden dasselbe Raster, weiß auf Schwarz mit ausreichendem Rand. Kein einzelner Buchstabe als Ersatzlogo.
- `branding/favicon.svg` ist die Quelle der Website-Icons. `bash scripts/brand-assets.sh` erzeugt SVG-/ICO-/PNG-Varianten und die Social-Vorschau. Änderungen an iOS sind ein separater Arbeitsschritt.
- Header und Startup-Zeichen invertieren mit dem gewählten Theme. Geometrie und Proportionen bleiben unverändert.
