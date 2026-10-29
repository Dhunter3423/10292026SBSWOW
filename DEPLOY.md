# Deploying the Schools+ Ops WOW dashboard

Netlify Blobs turns itself on, so there is no database to create and no
environment variable to set. The only thing that matters is that **all of these
land together**:

```
index.html
netlify.toml
package.json
netlify/functions/targets.mjs
netlify/functions/imports.mjs
node_modules/@netlify/blobs/      (vendored, see the note at the end)
```

## First: which kind of site is this?

Open the site in Netlify and look at the **Deploys** tab.

- **There is a drag and drop zone** ("Drag and drop your site output folder
  here"): the site is a manual-deploy site. Use route A.
- **There is no drop zone**, and the page says the site builds from GitHub or
  shows a repository name: the site is **locked to Git**. Manual deploys do not
  apply, and this is why a drag and drop appears to do nothing. Use route B.

That one check explains almost every "I redeployed and the changes did not come
through".

## Route A: drag and drop

Drag **`SBS_Schools_WOW_Netlify.zip` itself** onto the drop zone. Do not unzip it
first and do not drag `index.html` on its own.

The files inside the zip sit at the top level, which is what Netlify expects. If
you ever build the zip yourself, zip the **contents** of this folder, not the
folder: a zip containing a single wrapper directory publishes the site one level
too deep and every page 404s.

Wait for **Published**, then hard reload the page (Cmd-Shift-R, or Ctrl-F5).

## Route B: GitHub, which is the better long-term home

Unzip the bundle, put the files at the **root of the repository** (not inside a
subfolder), commit and push to the production branch. Netlify builds on the push.

```bash
unzip SBS_Schools_WOW_Netlify.zip -d sbs-dashboard
cd sbs-dashboard
git init                       # only the first time
git remote add origin https://github.com/<your-org>/<repo>.git
git add .
git commit -m "Hours by State split by service, CMA merged into BI"
git push -u origin main
```

Using the GitHub website instead of the command line: open the repo, **Add file**
then **Upload files**, and drag the unzipped **contents** in. Dragging the
`netlify` folder preserves the `netlify/functions/` path, which matters. Commit
to the production branch.

You can leave `node_modules` out on this route: Netlify runs `npm install` from
`package.json` during the build.

Netlify build settings, which `netlify.toml` already sets:

- Build command: leave blank
- Publish directory: `.`
- Functions directory: `netlify/functions`

## Route C: straight from your machine, bypasses both

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=.
```

Run it from the unzipped folder. This works whether or not the site is linked to
Git, and it is the fastest way to settle an argument about whether a deploy
actually landed.

## Confirming the deploy actually landed

Three checks, in order of how much they tell you:

1. **The page itself.** The Hours by State card should show stacked bars with a
   legend, an **All services** dropdown and a **By service** button in its
   header. If it is still a donut, you are looking at the old build.
2. **The functions.** Open `https://<your-site>/api/targets` in a tab. JSON or
   the word `null` means the functions are live. A Netlify 404 page means they
   are gone and the whole folder needs redeploying.
3. **The badge.** The header should read **Shared**, not This browser, with no
   red banner across the top.

If the page looks unchanged, check these before assuming the deploy failed:

- **You are on the production URL.** A deploy preview URL with a long hash in
  front (`https://6ab845c7...--yoursite.netlify.app`) is one frozen deploy and
  will never show a later change.
- **Hard reload.** `netlify.toml` sets `Cache-Control: no-cache` on
  `index.html`, but a reload that skips revalidation can still serve the old
  copy. Cmd-Shift-R or Ctrl-F5, or open the site in a private window.
- **The Deploys tab shows your deploy at the top, marked Published.** If the
  newest entry is older than your attempt, the deploy never happened.

## The single-file trap

Publishing `index.html` on its own replaces the whole site and takes the two
functions with it. The page still loads and still looks right, but
`/api/targets` starts answering 404, the badge flips to **This browser**, and
every upload and target edit quietly stays in that one browser. The page detects
this and puts a red banner across the top naming the status code and the missing
files.

No data is lost when it happens: the Blobs store survives a bad deploy, so
redeploying the full set brings every import and saved target straight back.

## What is stored where

| Thing | Where it lives |
| --- | --- |
| Uploaded SLDR imports | Netlify Blobs, store `sbs-wow`, keys `import/<id>` plus an `imports-index` |
| Targets, forecast, Needs List figures | Netlify Blobs, key `targets` |
| Fallback snapshot | Inside `index.html`, used only when the functions are unreachable |
| Per viewer conveniences | `localStorage`, used only when there is no backend |

Uploads accumulate. When two imports both cover a week, the newer upload wins, so
re-uploading a corrected export supersedes the old figures without anyone
deleting anything. The 24 most recent imports are kept.

## Endpoints

| Route | Methods | Purpose |
| --- | --- | --- |
| `/api/targets` | GET, PUT, DELETE | The shared targets document |
| `/api/imports` | GET, POST, DELETE | Import index, one import by `?id=`, upload, remove by `?id=` or `?all=1` |

## Access

If the site is behind a Netlify password or Netlify Identity, note that a
Smartsheet Web Content widget will render the login wall rather than the
dashboard. Embedding needs the gate off, or moved.

## Why node_modules is in the bundle

`@netlify/blobs` is the only dependency, it is 160KB and it has no dependencies
of its own. Vendoring it means a drag and drop deploy works with no build step at
all. On the GitHub route Netlify runs `npm install` anyway and the vendored copy
is ignored, so it is safe to leave out there.

## Editing the dashboard

`index.html` is generated. The source is `source.html` plus `build.py` in
`SBS_source.zip`: edit `source.html`, run `python3 build.py`, and it writes
`deploy/index.html`. The page carries its own source internally so it can
republish itself, and hand-editing the built file would leave that embedded copy
stale.
