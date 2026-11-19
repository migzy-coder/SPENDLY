# Hyperframes Composition Brief: Spendly

## Objective
Create a 22-second vertical launch video for Spendly, the mobile-first PWA that tells people in Cameroon what they can still spend today, until payday.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: vertical — 1080x1920 at 30 fps
- Duration: 22.0 seconds

## Source Material
- Project root: `C:\Users\Ultra Tech\Desktop\SPENDLY`
- Primary files read: `index.html`, `src/index.css`, `src/lib/i18n/fr.ts`, `src/routes/Today.tsx`, `src/routes/Simulator.tsx`, `src/components/AddSheet.tsx`, `README.md`
- Product name: Spendly
- Tagline / strongest claim: "Trois taps le soir. Une idée claire de ce que tu peux dépenser." / welcome title "Ton argent, sans stress."
- Key UI or visual moment to recreate: the Today hero (tiny uppercase `À DÉPENSER`, giant XAF number, white card on cream), the add sheet (Catégorie / Montant / Type de paiement), and the simulator verdict card.
- Copy that must appear verbatim:
  - "À DÉPENSER"
  - "Tu peux dépenser environ 3 100 XAF aujourd'hui"
  - "Bonsoir, Miguel"
  - "Où est parti l'argent" (secondary, optional)
  - "Puis-je me le permettre ?"
  - "Ça rentre dans ton budget"
  - "Tu restes tranquille, c'est confortable."
  - "Ton argent, sans stress."
  - "Trois taps le soir. Une idée claire de ce que tu peux dépenser."
  - "Catégorie", "Montant", "Type de paiement"

## Creative Direction
- Tone preset: `default`
- Creative direction: a calm, warm evening check-in shot in Douala — not a bank, not a Silicon Valley launch. Human, modern, quietly confident.
- Interpretation: comfortable pacing, few scenes with room to breathe, clean cuts, warm cream ground, navy type, one cobalt accent used only where it means something; humor comes from recognition, not gags.
- Angle: everyone knows the end-of-month feeling. Spendly answers the one question that matters in three taps, in XAF.
- Hook: a giant "12 500 F" then "9 jours. Combien par jour ?" — the arithmetic the viewer does badly in their head.
- Outro / punchline: the icon and wordmark land, then "Ton argent, sans stress."
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals, waveform bars, floating orbs
  - Unrelated visual redesign, neon gradients, stock African imagery
  - Device mockups cluttered with browser chrome

## Visual Identity
- Background: `#FAF7F0`
- Surface: `#FFFFFF`
- Text: `#15233E`
- Muted: `#5F6C86`
- Accent: `#2F6BF0`
- Accent tint: `#E6EEFF`
- Gold: `#F5B83D`
- Success: `#12805F`
- Danger: `#C0392B`
- Display font: Inter 800/900 (closest bundled face to the app's SF Pro / Segoe UI stack)
- Body font: Inter 400/500
- Visual references from the project: Today hero card, category chips, add sheet rows, simulator verdict card, app icon (`assets/brand/icon.png`), mascot (`assets/brand/mascot-home.webp`, optional small appearance in the outro).

## Storyboard
Use `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. The arithmetic — 3.0s — cream, "JUSQU'À LA PAIE", giant "12 500 F", then "9 jours. Combien par jour ?"
2. The answer — 2.8s — "3 100 F / jour", white pill with "Tu peux dépenser environ 3 100 XAF aujourd'hui", small app icon.
3. The Today screen — 4.6s — phone-shaped white card with "Bonsoir, Miguel", "À DÉPENSER", "12 500 XAF", allowance line, chips, streak.
4. Three taps — 5.0s — + ripple, add sheet, Food selected, 2500 typed, "Enregistrer 2 500 · Food", number rolls 12 500 → 10 000, caption "Trois taps. C'est noté."
5. Before you spend — 3.2s — "Puis-je me le permettre ?", "Cinéma · 3 000 F", green verdict "Ça rentre dans ton budget" + "Tu restes tranquille, c'est confortable."
6. Outro — 3.4s — icon + "Spendly", "Ton argent, sans stress.", product tagline, "FR · EN — Android · iOS — spendly.miguelyango.com".

## Audio
- Audio role: warm upbeat bed with sparse, motion-matched accents
- Audio arc: groove in from the first frame, steady under the flow, exhale on the green verdict, fade under the brand landing
- Music: `assets/music/happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (110 BPM, 60 s)
- Music treatment: start at 0, hold under visuals, 1.2s fade-out from 21.4s to 22.0s
- Music cue guidance: preset `cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`; strong cues 18.55s (wordmark) and 20.19s (tagline); beat grid 10.93 / 11.47 / 12.02 / 12.56 / 13.11 / 13.64 for the taps
- Audio-reactive treatment: subtle; hero card shadow depth and cobalt accent presence may breathe with RMS, never waveform visuals
- Audio-coupled moments:
  - scene 1 number + question line — low tick
  - scene 3 chips — beat-grid ticks
  - scene 4 three taps — one soft tick each, aligned ±0.10s to alternate beats
  - scene 4 number roll — soft count ticks
  - scene 5 verdict — short positive pop
  - scene 6 wordmark — one warm mark
- SFX selection guidance: soft UI taps, a gentle card whoosh only on the add sheet, one warm logo hit; avoid cash register, coins, whooshes on every cut
- SFX analysis guidance: use brag's `assets/sfx/sfx-analysis.md` where helpful; prefer lower high-frequency-risk sounds
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density and volume after the animation exists
- Audio files: music is already at `brag-output/composition/assets/music/`; copy any chosen SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Follow the Hyperframes contract and the brag-specific overrides in `.agents/skills/brag/references/step-3-compose.md`:
- Skip the generic Hyperframes storyline/SPEC workflow; this brief and `brag-plan.md` replace it.
- Keep all text readable; hold settled text long enough to read.
- Show the real Today UI, add sheet and simulator verdict — no abstract filler.
- 1080×1920, 30 fps, root `data-duration="22"`.
- Use the bundled music and a restrained SFX layer.
- Run `npx hyperframes check` before render — it is the single gate.
- Keep creation and rendering local.
