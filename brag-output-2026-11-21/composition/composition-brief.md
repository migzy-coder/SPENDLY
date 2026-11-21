# Composition brief — Spendly voice-led brag v2

Project: `brag-output-2026-11-21/composition`
Root: `data-duration="25"` at 1080×1920, 30 fps → 750 frames.
Single root GSAP timeline on `window.__timelines["main"]`, paused.

## LOOK
Calm, elegant, warm: cream ground, white cards, navy type, cobalt only where it means something, gold only for the payday dot. Generous negative space. No dark navy backgrounds. Inter / system stack, tabular figures.

## Source material (must be used, not hand-redrawn)
- `assets/ui/today-top.png` — Today screen rendered from `src/routes/Today.tsx` with fictional account Aïcha, 28 000 XAF, 3 100 F/day, 9 days.
- `assets/ui/today-after-top.png` — same real screen after logging Food 2 500: 25 500 XAF, 2 800/day.
- `assets/ui/sheet.png` — the real add sheet from `src/components/AddSheet.tsx` (Point du soir, categories, amount, payment chips).
- `assets/ui/simulator-verdict.png` — the real simulator from `src/routes/Simulator.tsx`: "Puis-je me le permettre ?", cinema 3 000 F, "Ça rentre dans ton budget", success mascot.
- `assets/welcome.webp`, `assets/success.webp`, `assets/icon.png` — real mascot and app icon from the repo.
- App copy used verbatim where shown: "Tu peux dépenser environ 3 100 XAF aujourd'hui", "Point du soir", "Enregistrer 2 500 · Food", "Ça rentre dans ton budget", "Tu restes tranquille, c'est confortable.", "Ton argent, sans stress."

## Scene timing
1. 0–4.6 Hook — 28 000 F, 9 dots, "Combien par jour ?" at 3.4 s.
2. 4.6–8.6 Answer — nine blocks → 3 100 F/jour → white pill app line + icon.
3. 8.6–13.6 Product — real Today screen + "Fait à Douala, pour ceux qui sont payés chaque mois."
4. 13.6–18.6 Three taps — real sheet, Food, 2 500, save, then real Today at 25 500 / 2 800 + "Trois taps. C'est noté."
5. 18.6–22.0 Check — real simulator verdict + mascot.
6. 22.0–25.0 Outro — welcome mascot, icon, Spendly, tagline, `spendly.miguelyango.com — ouvre-le sur ton téléphone`. Hold.

## Captions
Burned-in French captions, one per voice phrase, at y≈1372, x 70–930, navy on translucent cream. Synchronized to voice starts 0.2 / 4.8 / 8.8 / 13.8 / 18.8 / 22.2. `captions.srt` mirrors them.

## Safe zones
All readable content between y 250 and y 1536. In the lower half nothing extends past x 940. Debug overlay available in `zones.html`.

## Audio
`assets/final-mix.m4a` — pre-mixed 25 s stereo: vol-12 music bed (109.96 BPM) ducked ~11 dB under French `ff_siwis` voice at the exact supplied timestamps, sparse SFX, fade-out 23.5–25 s. One `<audio>` element at volume 1; no other audio elements.

## Render
`npx hyperframes check` must pass with zero errors. Snapshot every scene and one mid-transition, inspect, then render to `../brag.mp4`; bake best settled frame as frame 0 into `../brag.jpg`.
