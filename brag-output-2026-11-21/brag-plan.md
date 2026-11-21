# Brag Plan: Spendly (voice-led, v2)

## What is this app?
A browser PWA for people paid monthly in Cameroon: it turns the money left until payday into one honest daily number, updated in three evening taps.

## The angle
The arithmetic everyone does badly in their head — "28 000 F, 9 days, how much per day?" — done for them in one calm sentence. A quiet evening check-in, not a bank ad. Voice leads; captions carry the same words for muted viewers.

## Hook (first 2 s)
"Il te reste 28 000 francs." — a huge navy 28 000 F on cream, the small label JUSQU'À LA PAIE, then nine cobalt dots landing in a row. The question "Combien par jour ?" arrives at 3.4 s.

## Key moments
- The nine dots resolve into 3 100 F / jour in cobalt, followed by the app's own line on a white pill.
- The **real** Today screen, rendered from the app with Aïcha as the only fictional account: "Disponible à dépenser jusqu'au 29 nov.", 28 000 XAF, "Tu peux dépenser environ 3 100 aujourd'hui", category chips, streak.
- The real add sheet rising, a Food tap, 2 500 typed, then the real Today screen again at 25 500 / 2 800.
- The real affordability simulator: cinema 3 000 F, green verdict "Ça rentre dans ton budget", success mascot beside it.

## User flow shown
Evening balance → three taps to log Food 2 500 → the number updates → check a purchase in the simulator before spending.

## Tone
- Preset: `polished`
- Direction: calm, warm, unhurried French narration; elegant restraint; no hype.
- Interpretation: long settled holds, soft crossfades, one idea per scene, sparse sound.

## Format / duration
Vertical 1080×1920, 30 fps, 25.0 s exactly (750 frames). Scenes: 0–4.6, 4.6–8.6, 8.6–13.6, 13.6–18.6, 18.6–22.0, 22.0–25.0.

## Visual identity (from the repo)
- Background `#FAF7F0`, surface `#FFFFFF`, ink `#15233E`, muted `#5F6C86`
- Accent `#2F6BF0` / text-safe `#2456CB`, gold `#F5B83D` (payday only), success `#12805F`
- Font: Inter (bundled fallback to Segoe UI/system)
- Assets: real app UI stills rendered from `src/routes/Today.tsx` and `src/routes/Simulator.tsx`; `public/mascot/welcome.webp`, `public/mascot/success.webp`, `docs/assets/icon.png`

## Share copy (draft)
28 000 F, 9 jours avant la paie. Spendly te dit combien tu peux dépenser aujourd'hui. Trois taps le soir. spendly.miguelyango.com

## Audio direction
- Role: voice-led; warm light instrumental bed ducked under narration
- Voice: Kokoro `ff_siwis` (fr-FR), one take per phrase, placed at the supplied timestamps
- Music: `happy-beats-business-moves-vol-12` — 109.96 BPM, steady and clean
- Music treatment: starts at 0.2 s, volume 0.22, sidechain-ducked ~11 dB under voice (15 ms attack / 400 ms release), fade out 23.5–25 s
- Music cue guidance: vol-12 preset; strong cues at 8.74 s (product), 13.11 s (three taps), 18.56 s (verdict), 22.93 s (outro); major moments kept inside ±0.15 s
- Audio-reactive treatment: none — narration clarity first
- SFX posture: sparse; one soft tick per tap, a soft tick on the count roll, one short pop on the verdict, one warm mark on the logo
- Restraint rule: no whooshes on cuts, no cash-register clichés, no music rising over the last line

## Storyboard
### Scene 1 — Hook — 0–4.6 s
Huge "28 000 F", label "JUSQU'À LA PAIE", nine dots appear in a row; "Combien par jour ?" at 3.4 s.
Sequential: dots one by one. Audio: voice phrase 1; no SFX.

### Scene 2 — Answer — 4.6–8.6 s
The dots become nine equal blocks; one pops into "3 100 F / jour" in cobalt; the app's own line lands on a white pill with the real icon.
Sequential: blocks → highlighted block → number → pill. Audio: voice phrase 2; one soft pop.

### Scene 3 — Product — 8.6–13.6 s
Real Today screen in a white phone card, Aïcha, 28 000 XAF, 3 100 today, chips, streak. Burned caption: "Fait à Douala, pour ceux qui sont payés chaque mois."
Audio: voice phrase 3; clean bed.

### Scene 4 — Three taps — 13.6–18.6 s
Real add sheet rises; Food selected; "2 500" typed; save pressed; crossfade to the real Today screen at 25 500 / 2 800. Burned caption: "Trois taps. C'est noté."
Sequential: tap +, tap Food, type amount, save. Audio: voice phrase 4; one tick per tap, ticks on the roll.

### Scene 5 — Check before spending — 18.6–22.0 s
Real simulator: cinema 3 000 F, green verdict "Ça rentre dans ton budget", success mascot large beside the card.
Audio: voice phrase 5; short positive pop.

### Scene 6 — Outro — 22.0–25.0 s
Welcome-pose mascot, real app icon, "Spendly", "Ton argent, sans stress.", "spendly.miguelyango.com — ouvre-le sur ton téléphone". Hold the last frame.
Audio: voice phrase 6; one warm mark; music fades out.

**Music mood for this video:** warm, light, unhurried
**Audio summary:** a French voice carries the arithmetic and the product story over a ducked 110 BPM bed, ending on a clean brand line and a fade.
