# Git Forensic — 4-game last-good vs Production

```text
Sprint                 Git Forensic (no restore)
git revert / reset     NOT DONE
Vercel rollback        NOT DONE
Selective restore      HOLD — cause is not a game-src overwrite
```

CPO reads this path. No CEO paste required.

## Three anchors

| # | Meaning | SHA | Date |
| --- | --- | --- | --- |
| ① | Last 4/4 normal (page-move baseline) | `a7ae3aa` | 2026-09-07 — 4/4 MP Product Gate CLOSED |
| ② | Re:Front Complete (game + evidence) | `b66422a` / `e2b21bb` | 2026-09-07–08 |
| ③ | Current `main` / Production evidence | `732e720` | 2026-09-08 |

Related:

- Production before this promote: `f8a497a` (2026-09-06, catalog restore). Merge-base of that line and `732e720` **is** `f8a497a`. History is linear, not a crossed merge.
- Re:Front first added to catalog: `f8a497a`
- Re:Front visual gate build: `8fd85d5`
- Common Entry last code change: `50c9ef0`

## Per-game src

| Game | Last src change after `f8a497a` | `732e720` vs `a7ae3aa` | Regression in git? |
| --- | --- | --- | --- |
| Snake | `50c9ef0` (remove practice fallback) | **identical** | No |
| Agar | `a69b6de` (human identity) | **identical** | No |
| Bomber | `50c9ef0` (guest join) | **identical** | No |
| Re:Front | `b66422a` (EXPAND frontier) | **newer** (Complete Sprint) | No — preserved |
| Common Entry | `50c9ef0` | **identical** | No |

Post-`a7ae3aa` commits (`eddcfa5` … `732e720`) touch **Re:Front + QA/handover only**. They do not rewrite Snake / Agar / Bomber / catalog Entry blobs.

`origin/content-factory` is **older** for Agar / Bomber / Re:Front / common play-client. It has a divergent Snake delta-sync commit (`e367e40`) that was **never** an ancestor of `main`. That is a parallel branch, not a restore source.

Zero `revert` / `restore` commits exist in `f8a497a..732e720`.

## Promote check

`main` was fast-forwarded `f8a497a` → `e2b21bb` → `732e720`.

That **added** Re:Front Complete on top of the 4/4 line. It did **not** replace newer Snake/Agar/Bomber src with older blobs.

Live Production – game29:

- `e2b21bb` success (`6317910625`)
- `732e720` success (`6318501031`) → `https://game29-r8br6e126-jyp-ai1s-projects.vercel.app`
- Alias: `https://game29.vercel.app`

Legacy `Production – game-platform` also fired on the same SHAs. Do not use that project.

## Production browser (forensic only)

Checked `https://game29.vercel.app` Detail only (no restore, no full play):

| Page | ENTER WORLD | Note |
| --- | --- | --- |
| `/games/snake` | present | MORE GAMES = Breakout / Tic Tac Toe / Maze Runner |
| `/games/agar` | present | MORE GAMES = Breakout / Maze Runner / Galaxy Defender |
| `/games/re-front` | present | Hero thumb broken; MORE GAMES = Agar / Bomber / Tic Tac Toe |

Snake play href is still `/flagship/snake-io/play?room=WORLD` (same as `a7ae3aa`). Agar / Bomber / Re:Front use `/games/{slug}/play`.

`apps/web/public/images/games/re-front.png` exists on disk as **untracked**. It is **not** in any git commit (`git log --all` empty). Production cannot serve that thumb.

## Verdict

```text
① a7ae3aa     Snake/Agar/Bomber/Common Entry last-good
② b66422a     Re:Front Complete game (kept on ③)
③ 732e720     same as ① for the three PASS games

Cause of “overwrite” hypothesis: NOT CONFIRMED
git revert / Vercel rollback: FORBIDDEN until a new Work Order
Selective restore: HOLD
```

CEO-visible “old” signals that are **not** a 4/4 src rollback:

1. Re:Front thumb never committed
2. Snake still on flagship path
3. Detail MORE GAMES / patch notes still look like the old 50-game catalog
4. Dual GitHub Production envs (`game29` vs legacy `game-platform`)

## Next (CPO only)

Do not restore yet. If CPO confirms a real FAIL, the next Work Order should name the surface (thumb / related catalog / Snake href / gameplay), not a blanket rollback.
