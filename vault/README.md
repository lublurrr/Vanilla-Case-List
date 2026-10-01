# Case Vault

A linked case file reader for VCL. Drop this folder into the repo root as
`vault/` and it is live at `/vault/`. No build step, no dependencies, and it
reads its colours and fonts from `../styles.css`.

## Adding a case

1. Make `cases/<slug>/notes/` and `cases/<slug>/icons/`.
2. Write one markdown file per note in `notes/`.
3. Write `cases/<slug>/case.json` with the sidebar order.
4. Add the case to the `cases` array in `cases/cases.json`.

Optionally give `case.json` a `logo`, which replaces the title at the top of the
note whose `type` is `case`. It follows the same path rules as `icon`, so
`../images/cases/Name.png` reuses the artwork already on the site rather than
duplicating it.

Nothing else needs editing.

## Note format

```markdown
---
title: Knife
type: evidence
icon: icons/knife.png
aliases: [the knife, murder weapon]
---

Body text. Link other notes with [[knife]] or [[knife|the murder weapon]].
```

- `type` colours the badge and picks the fallback sidebar icon. Known values
  are `case`, `profile`, `evidence` and `map`. Anything else renders with no
  badge and the default icon.
- `icon` is optional. It renders as a plate floated to the top right of the
  note with the text wrapping around it, drawn at 2x so the pixel art stays
  sharp. It is skipped when the body already embeds that same image.
- `caption` is optional and labels the plate. Without it, `role` is used, and
  without either the plate has no caption.
- Paths are relative to the case folder unless they start with `http`, `/` or
  `../`, which lets a note point at an image the wider site already hosts.
- `aliases` let `[[the knife]]` resolve to `knife.md`. Matching is case
  insensitive and also tries the title.
- A wikilink pointing at nothing renders in red with a dotted underline rather
  than silently disappearing, so typos are visible during review.

Supported markdown: `##` to `####` headings, paragraphs, bullet and numbered
lists, blockquotes, tables, horizontal rules, images, links, bold, italic and
inline code. That is deliberately a subset. If a case needs more, replace
`renderMarkdown` in `vault.js` with a library and leave the rest alone.

## Backlinks

"Referenced by" at the bottom of a note is generated from the wikilinks in
every other note. There is nothing to maintain by hand.

## Local preview

The notes are fetched at runtime, so opening `index.html` from the file system
will not work. From the repo root:

```
python3 -m http.server 8000
```

then open `http://localhost:8000/vault/`.

## Role documents

Role documents stay as outbound links in `case.json`. A static site cannot keep
a hosted note away from a reader who wants it, so anything spoiler bearing
belongs behind the existing Google Doc permissions.
