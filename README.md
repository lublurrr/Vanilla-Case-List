# Vanilla Case List — Website

A drop-in static website for the Vanilla Case List. Just place this folder
anywhere on your existing website and link to its `index.html`.

> **New to GitHub or hosting websites?** See **`GITHUB_PAGES_SETUP.md`** in this folder for a step-by-step guide to publishing the site for free on GitHub Pages — no coding experience required.

## What's included

```
vanilla-case-list/
├── index.html               The main page (drop-in entry point)
├── styles.css               Ace Attorney inspired styling, manilla folder cards
├── app.js                   Search, sort, filter, random selector
├── cases.json               The case data — edit this to add/remove cases
├── site_info.json           Last-updated / scheduled-update labels for the Docket panel
├── images/
│   └── cases/               Many case logos
├── GITHUB_PAGES_SETUP.md    Beginner guide to hosting on GitHub Pages
└── README.md                This file
```

## Files you'll edit as a list maintainer

Almost all updates only touch two files:

- **`cases.json`** — add/remove/edit cases. Schema below.
- **`site_info.json`** — sets the "Last updated" and "Scheduled update" dates shown in the Docket panel. Open the file in any text editor and change the date strings.

The "What's new" list in the Docket panel is **auto-derived from cases.json**: cases with the most recent `approval_date` show up there automatically. You don't need to maintain it separately.

## Features

- **118 cases** with titles, creators, descriptions, difficulty, length, tags, approval dates, and links — extracted directly from the source PDFs.
- **Manilla folder card design.** Every panel has a folder-tab on top: difficulty tabs (EASY/MEDIUM/HARD) for cases, plus RANDOM, THE DOCKET, FILTERS, and FAQ tabs for the larger panels.
- **The Docket panel** shows last-updated date, scheduled next update, current case count, and an auto-derived "What's new" list of cases from the most recent update.
- **Featured Case** in the Random panel — automatically displays the most recently approved case as a clickable preview.
- **Grid / List view toggle** — switch between the 3-column card grid (default) or a single-column row layout that resembles the original VCL doc. Your preference is remembered between visits.
- **Search** by title, creator, or description.
- **Filter** by difficulty (Easy/Medium/Hard), length (Short/Moderate/Long), and tags (NEW, Tutorial, Custom Files). Tag filters stack — pick multiple. The **NEW** and **Custom Files** tags are detected automatically (see *Automatic tags* below), so the filters always reflect reality.
- **NSFW filter** — a "Hide NSFW cases" toggle in the filter row. Off by default; flip on to hide explicit cases. The random picker respects this toggle.
- **Sort** by Difficulty Order (default), Length Order, Alphabetical (A–Z or Z–A), or Most Recently Added (uses real approval dates from the update history).
- **Random Case picker** with optional difficulty restriction. Roll Again button included.
- **Custom Files = clickable downloads.** When a case has a `custom_files_url` set, a green "Custom Files" pill appears automatically and links straight to the Drive folder for that case's assets. No tag needed.
- **Resources nav strip** — Vanilla Ultimate Archive, Resource Library, Casing Hub Discord, Tier List, Submit form, FAQ.
- **Built-in FAQ section** (toggleable) — all Q&As from the original doc.
- **Mobile-responsive** down to phones.
- **No build step, no dependencies.** Pure HTML/CSS/JS.

## Hosting

Because the site loads `cases.json` via `fetch()`, **it must be served from a web server.** Opening `index.html` directly with a double-click (`file://`) will look broken. This is a browser security restriction.

Three easy hosting options:

1. **Drop into your existing site.** Upload the whole folder somewhere on your server (e.g. `https://yoursite.com/vcl/`) and visit the URL. Done.
2. **Local testing.** From this folder, run `python3 -m http.server 8000` then open <http://localhost:8000>.
3. **Static host** like GitHub Pages, Netlify, Cloudflare Pages, or Vercel — just drag the folder in.

If somebody opens the site via `file://` by accident, they'll see a clear in-page error explaining what went wrong.

## Adding a case

Open `cases.json` and append a new object to the **end** of the array. Example:

```json
{
  "id": 119,
  "title": "Turnabout Awesome",
  "creator": "Your Name",
  "description": "A short blurb that appears on the card. Keep it under ~250 characters.",
  "difficulty": "medium",
  "length": "Moderate",
  "tags": [],
  "url": "https://docs.google.com/document/d/.../edit",
  "custom_files_url": "https://drive.google.com/drive/folders/.../",
  "approval_date": "2026-06-01",
  "image": "images/cases/case_119.jpg",
  "logo_credit": "Artist Name"
}
```

> **You no longer add `"NEW"` or `"CUSTOM FILES"` to `tags` by hand** — see *Automatic tags* below. In the example above, the case gets the **Custom Files** pill automatically because `custom_files_url` is filled in, and the **NEW** badge automatically because its `approval_date` is the latest one. Leave `tags` empty unless the case is `"NSFW"` or a `"Tutorial Case"`.

### Field reference

| Field              | Type     | Allowed values                                                     |
|--------------------|----------|--------------------------------------------------------------------|
| `id`               | number   | Any unique integer. It's a permanent name tag, **not** a position — give each new case the next highest unused number and never renumber or reuse one. Gaps left by deleted cases are fine. |
| `title`            | string   | Display name                                                       |
| `creator`          | string   | Author handle(s)                                                   |
| `description`      | string   | Short summary                                                      |
| `difficulty`       | string   | `"easy"`, `"medium"`, or `"hard"`                                  |
| `length`           | string   | `"Short"`, `"Moderate"`, or `"Long"` (or `null`)                   |
| `tags`             | array    | Manual tags only: `"Tutorial Case"` and/or `"NSFW"`. **Do not add `"NEW"` or `"CUSTOM FILES"`** — those are automatic (see *Automatic tags*). Use `[]` for most cases. |
| `url`              | string   | Link to the case document (use `null` if not yet available)        |
| `custom_files_url` | string   | (Optional) Direct download URL for case-specific assets. **Setting this automatically shows the green "Custom Files" pill** — no tag required. Leave it out or `null` if there are none. |
| `approval_date`    | string   | ISO date when added to VCL (e.g. `"2026-05-01"`). Drives card ordering, the "Most Recently Added" sort, the Docket "What's new" list, and the automatic **NEW** badge (every case sharing the most recent date is marked NEW). |
| `image`            | string   | Path to the logo image, e.g. `"images/cases/case_119.jpg"`         |
| `logo_credit`      | string   | (Optional) Who made the case logo. Shown as "Logo by …" beneath the logo in the case popup. Omit it or use `null`/`""` if there's no credit to show. |

### Automatic tags

Two of the tags maintain themselves — you never type them into `cases.json`:

- **⭐ NEW** is given to every case whose `approval_date` matches the most recent `approval_date` in the whole file. When you add the next batch (all sharing a newer date), they become NEW and the previous batch stops being NEW — automatically. Nothing to remove by hand.
- **Custom Files** appears whenever a case has a `custom_files_url`. Fill that field in and the linked green pill shows up; leave it blank and it doesn't.

Both also drive their filter chips, so the NEW and Custom Files filters always match what's on the cards. (Any old `"NEW"`/`"CUSTOM FILES"` entries still sitting in `tags` are simply ignored, so nothing breaks — but you can delete them whenever you like.)


Then drop the logo image into `images/cases/` using a matching filename. Recommended size: ~300×170 px, JPG or PNG. The grid scales it to fit automatically.

## Removing a case

Delete its object in `cases.json`. The card will disappear on the next page load. You can also delete the matching image file from `images/cases/` to keep the folder tidy.

## Editing the Docket panel (last updated / scheduled update)

Open `site_info.json`. It has just three fields you'll typically touch:

```json
{
  "scheduled_update": "2026-06-01",
  "scheduled_update_label": "1st June 2026"
}
```

- **`scheduled_update`** is the ISO date (YYYY-MM-DD) of the next planned update. Used for sorting/internal logic.
- **`scheduled_update_label`** is what the user sees ("1st June 2026"). If you'd rather just write something like "Coming soon" or "TBA", you can — it's just text.

The "Last updated" date is computed automatically from the most recent `approval_date` in `cases.json`. If you want to override that for some reason, set `last_updated_override` and `last_updated_label_override` in `site_info.json` (see the comments in the file).

The "What's new" list is computed automatically from cases whose `approval_date` matches the latest update date. If you ever want to curate that list manually, set `whats_new_override` to an array of case IDs (e.g. `[1, 2, 3]`).

## Editing a case

Edit the fields directly in `cases.json` and reload. No build step.

## Customizing the look

All visual tweaks live in `styles.css`. The colour palette is in `:root` at the top — edit the `--easy`, `--medium`, `--hard`, `--cream`, `--ink` etc. variables to retheme.

The folder-tab look uses `clip-path` for the slanted edge — modify the polygon coords to change the tab silhouette.

## Monthly update workflow

When the next update rolls around (e.g. "1st June 2026"), do this:

1. **For each new case**, append an entry to the end of `cases.json` with the next unused `id`, all the case fields, and `"approval_date": "2026-06-01"` (matching that update's date). Leave `tags` empty (`[]`) unless it's NSFW or a tutorial — the **NEW** badge and the **Custom Files** pill are added automatically from `approval_date` and `custom_files_url`.
2. **Drop the new case logo** into `images/cases/` named to match (e.g. `case_119.jpg`).
3. **Open `site_info.json`** and change the `scheduled_update` and `scheduled_update_label` to the date AFTER this one (e.g. "1st July 2026").
4. **Save and refresh.** The "Last updated" date in the Docket panel will auto-update to "1st June 2026", the case count will increment, the new cases will sort to the top of their difficulty bands, the "What's new" list will list them, and they'll get the ⭐ NEW badge while the previous batch loses it — all automatically. No further edits required.

If you're using GitHub to host the site, see `GITHUB_PAGES_SETUP.md` for the editing workflow through GitHub's web interface (no command-line tools needed).

— Built for the Vanilla Casing Hub. Happy casing!
