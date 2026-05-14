# Hosting the Vanilla Case List on GitHub Pages

This guide walks you through publishing the site for free on GitHub Pages, even
if you've never used GitHub before. **No coding experience required.**

You'll end up with a public URL like `https://YOUR-USERNAME.github.io/vanilla-case-list/`
that anyone can visit.

---

## What you need

- The `vanilla-case-list` folder (the one this README is inside).
- A free GitHub account. Sign up at <https://github.com/signup> if you don't have one.
- A web browser. That's it — no software installs needed for the basic workflow.

---

## The plan

1. Create a free GitHub account (if you don't already have one)
2. Make a new "repository" (a folder hosted on GitHub) and upload the site files
3. Turn on GitHub Pages
4. Visit your live site

Each step has pictures-equivalent instructions. Take your time.

---

## Step 1 — Sign up / sign in to GitHub

Go to <https://github.com>. If you have an account, sign in. If not:

1. Click **Sign up** in the top-right corner.
2. Pick a username — this becomes part of your URL (e.g. `frickau` → `frickau.github.io`).
3. Use any email and password you like. Verify your email when GitHub asks.

That's it for the account.

---

## Step 2 — Create a new repository

A "repository" (or "repo") is just a folder GitHub hosts for you.

1. After signing in, click the **+** in the top-right corner of GitHub, then click **New repository**.
2. Fill in the form:
   - **Repository name:** `vanilla-case-list` (lowercase, hyphens, no spaces)
   - **Description:** optional, e.g. "The Vanilla Case List website"
   - **Public** — leave this selected. (GitHub Pages on a free account requires public repos.)
   - **Initialize this repository with: README** — leave this UNCHECKED. We'll upload our own files.
3. Click the green **Create repository** button at the bottom.

You're now looking at an empty repository.

---

## Step 3 — Upload the website files

You'll see an empty page with the heading **"Quick setup — if you've done this kind of thing before"** and a section below that says **"…or upload an existing file"**. We're using that one.

1. Click the **"uploading an existing file"** link.
2. You'll see a big drag-and-drop area saying **"Drag files here to add them to your repository"**.
3. Open the `vanilla-case-list` folder on your computer in a separate window.
4. Select **everything inside** the folder (NOT the folder itself):
   - `index.html`
   - `styles.css`
   - `app.js`
   - `cases.json`
   - `site_info.json`
   - `favicon.ico`
   - `README.md`
   - the `images` folder (drag this whole folder)
   - the `GITHUB_PAGES_SETUP.md` (this file)

   On Windows: open the folder, press `Ctrl+A` to select all, then drag.
   On Mac: open the folder, press `Cmd+A` to select all, then drag.
5. Drag everything into the GitHub upload area. **The whole `images` folder will upload along with the loose files** — you'll see a list of all the files appear.
6. Wait until all the files have finished uploading (you'll see the file count tick up). It can take a minute or two because there are 118 case logo images.
7. Scroll down. There's a **"Commit changes"** box at the bottom.
   - Top field: leave the default text or write something like "Initial upload of the site".
   - Below that: leave **"Commit directly to the main branch"** selected.
8. Click the green **Commit changes** button.

Wait a moment — GitHub will redirect you to your repository, now full of files.

---

## Step 4 — Turn on GitHub Pages

1. In your repository, click the **Settings** tab near the top right (it's between "Insights" and the bell icon).
2. In the left sidebar, click **Pages** (under "Code and automation").
3. Under **Build and deployment** → **Source**, the dropdown should already say **"Deploy from a branch"**. Leave it.
4. Below that, under **Branch**, you'll see two dropdowns. Set them to:
   - **First dropdown:** `main`
   - **Second dropdown:** `/ (root)`
5. Click **Save**.

GitHub will now build your site. It usually takes 1–3 minutes.

---

## Step 5 — Visit your live site

Refresh the GitHub Pages settings page after a couple of minutes. You'll see a green box at the top saying:

> **Your site is live at https://YOUR-USERNAME.github.io/vanilla-case-list/**

Click the link! That's your site. Share it with anyone.

If it doesn't appear right away, wait another minute or two and refresh. First-time builds can be slow.

---

## Step 6 — Make the Discord embed image work (one-time fix)

When someone pastes your site link into Discord, Discord shows a preview card ("embed") with the VCL logo. For that logo to show up, the site needs the **full** image URL — and you only know that URL after Step 5.

1. Note your live URL from Step 5, e.g. `https://YOUR-USERNAME.github.io/vanilla-case-list/`
2. In your repository, open `index.html` and click the pencil icon (✏️) to edit it.
3. Near the top, find these two lines:
   ```
   <meta property="og:image" content="images/vcl-logo.png" />
   ```
   ```
   <meta name="twitter:image" content="images/vcl-logo.png" />
   ```
4. Change **both** `images/vcl-logo.png` values to the full URL — your live URL with `images/vcl-logo.png` on the end. For example:
   ```
   <meta property="og:image" content="https://YOUR-USERNAME.github.io/vanilla-case-list/images/vcl-logo.png" />
   ```
   ```
   <meta name="twitter:image" content="https://YOUR-USERNAME.github.io/vanilla-case-list/images/vcl-logo.png" />
   ```
5. Scroll down, write a commit message like "Fix embed image URL", and click **Commit changes**.

That's it — you only ever need to do this once. To test it, paste your site link into a Discord channel; you should see the VCL logo in the preview card. (If Discord still shows the old preview, it's caching — try adding `?v=2` to the end of the link once to force a refresh.)

---

## Editing the site after it's live

Once everything's up, you don't need to repeat the upload process. To make changes (e.g. add a case, change the scheduled update date), do this through GitHub's website:

### Editing a single file

1. Open your repository at `github.com/YOUR-USERNAME/vanilla-case-list`.
2. Click the file you want to edit (e.g. `cases.json` or `site_info.json`).
3. Click the **pencil icon** (✏️) in the top right of the file view to start editing.
4. Make your changes.
5. Scroll down. In the **"Commit changes"** box:
   - Write a brief description like "Add Turnabout Awesome".
   - Leave **"Commit directly to the main branch"** selected.
6. Click **Commit changes**.

GitHub Pages will automatically redeploy your site within a minute or so.

### Adding a new case logo image

1. Open your repository.
2. Click the `images` folder, then the `cases` folder.
3. Click **Add file** → **Upload files** in the top right.
4. Drag the new logo file in (named like `case_119.jpg`).
5. Scroll down, write a commit message ("Add logo for case 119"), click **Commit changes**.

### Removing a case

1. Open `cases.json` and edit it to remove that case's entry (everything from `{` to `},` for that case).
2. Optionally also delete the corresponding `images/cases/case_NNN.jpg` file by clicking it and pressing the trash-can icon.

---

## What if something goes wrong?

### "Page not found" / 404 when visiting the URL

- Wait 2-3 more minutes. First builds can be slow.
- Make sure `index.html` is in the **root** of the repository, not inside a subfolder. Open the repository — `index.html` should be visible at the top level alongside `app.js`, `styles.css`, etc. If you see a `vanilla-case-list/` folder containing those files, you uploaded the parent folder by mistake. To fix: click into that subfolder, click each file, click "Edit" → no need to change anything — actually the easier fix is to delete the repo and start over making sure to drag files INSIDE the folder, not the folder itself.

### "Couldn't load cases.json" message on the page

- Open your live URL in a browser. If you see this error, it means GitHub Pages built the site but something is wrong with the file paths.
- The most likely cause: `cases.json` didn't upload. Visit your repo and check that `cases.json` is there at the top level. If not, repeat the upload step for that file.

### Updates aren't showing up

- GitHub Pages caches aggressively. After committing changes, hard-refresh your browser (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on Mac).
- Wait 1–2 minutes after committing for the deploy to finish.

---

## Tips

- **Bookmark your repo URL.** That's where you go to make any changes.
- **Don't worry about breaking things.** Git keeps a history of every change. If something goes wrong, click the **History** link on any file to see previous versions and revert.
- **Custom domain (optional, advanced):** GitHub Pages supports custom domains like `vcl.example.com` if you own one. See <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site> when you're ready.
- **The "Mobile Version" link / nice short URL:** Once your site is live, you can mention the URL in the original VCL doc, Discord, etc. The URL will be `https://YOUR-USERNAME.github.io/vanilla-case-list/`.

---

## Daily editor workflow (cheat sheet)

You'll mostly edit two files:

- **`cases.json`** — the master list of cases. Add/remove cases here.
- **`site_info.json`** — the docket panel info. Update the `scheduled_update` date here when planning the next update.

For each update cycle:

1. **Add new cases** to `cases.json` (give each a fresh `id`, set `approval_date` to today's date or the planned update date).
2. **Add corresponding logos** to `images/cases/`.
3. **Update `site_info.json`** to set the next `scheduled_update` date.
4. The "What's new" panel auto-detects which cases are new based on `approval_date`. You don't need to maintain it by hand.

That's the whole rhythm. Happy hosting!
