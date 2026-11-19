# Brag Plan: Spendly

## What is this app?

Spendly is a mobile-first PWA for people paid on a monthly cycle in Cameroon: it turns your income, fixed costs and payday window into one honest number telling you what you can still spend today — without opening a spreadsheet.

## The angle

Everyone knows the end-of-month feeling: you have money in your hand, but no idea whether you can afford tomorrow. Spendly answers that one question in the evening, in three taps, in XAF. The video is not a bank ad and not a productivity pitch; it is a quiet evening check-in that turns a vague balance into a daily allowance. The hook is the arithmetic everyone does badly in their head, done for them: "28 000 F until payday, 9 days left — so 3 100 F today."

## Hook (first 2-3 seconds)

A giant cream-and-navy "28 000 F" sits alone on the page. A small label reads "jusqu'à la paie". Then a second line lands: "9 jours. Combien par jour ?" The viewer leans in because they have done this math in their head and gotten it wrong.

## Key moments (the middle)

- The answer snap: "3 100 F / jour" lands with the app mark and the actual line "Tu peux dépenser environ 3 100 XAF aujourd'hui".
- The Today screen, recreated from the real UI: "Bonsoir, Miguel", "À DÉPENSER", the big count, category chips, and the streak row.
- Three taps: the + button opens the add sheet, "Food" is picked, "2 500" is typed, "Enregistrer 2 500 · Food" is pressed, and the big number rolls from 28 000 to 25 500 while the allowance line becomes "Tu peux dépenser environ 2 800 XAF aujourd'hui".
- The affordability simulator: "Puis-je me le permettre ?" → a cinema at 3 000 F → the green verdict "Ça rentre dans ton budget" with "Tu restes tranquille, c'est confortable."

## Outro / punchline

The Spendly icon and wordmark land on the cream page. "Ton argent, sans stress." Then the product's own line: "Trois taps le soir. Une idée claire de ce que tu peux dépenser." A last small line: "FR · EN — Android · iOS — spendly.miguelyango.com".

## User flow worth showing

Entry: onboarding math already done (income, fixed costs, payday window → daily allowance). Key action: log an evening spending in three taps (category → amount → save). Result: the Today number updates immediately and tomorrow's allowance adjusts. The simulator is the "check before you spend" companion beat.

## Tone

- Preset: `default`
- Creative direction: a calm, warm evening check-in shot in Douala — not a bank, not a Silicon Valley launch. Human, modern, quietly confident.
- Interpretation: comfortable pacing, few scenes with room to breathe, clean cuts, warm cream ground, navy type, one cobalt accent used only where it means something; humor comes from recognition, not gags.

## Format: vertical — 1080x1920
## Duration: 22 seconds

## Visual identity (from the project)

- Background: `#FAF7F0` (app cream)
- Surface: `#FFFFFF` (cards)
- Text: `#15233E` (navy ink)
- Muted: `#5F6C86`
- Accent: `#2F6BF0` (cobalt)
- Accent tint: `#E6EEFF`
- Gold: `#F5B83D` (payday window)
- Success: `#12805F`
- Display font: Inter 800/900 (closest bundled face to the app's SF Pro / Segoe UI stack)
- Body font: Inter 400/500
- Strongest visual element: the Today hero — tiny uppercase label, enormous navy number, cream page, white cards with soft shadows, cobalt chips, gold payday marker.

## Share copy (draft)

Spendly te dit chaque soir ce qu'il te reste à dépenser jusqu'à la paie. Trois taps, et c'est réglé.

## Audio direction

- Role: warm upbeat bed with sparse, motion-matched accents
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3` (110 BPM, 60 s, bundled CC BY track)
- Music treatment: enter at full but sit under the visuals, no fade-in longer than 0.3 s; hold steady through the flow; 1.2 s fade-out over the final logo so the last line lands clean
- Music cue guidance: preset read (`cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`); strong cues 18.55 s and 20.19 s for the outro wordmark and tagline; beat grid around 10.93 / 11.47 / 12.02 / 12.56 / 13.11 for the three-tap sequence (snap every other beat, not every beat)
- Audio-reactive treatment: subtle; let the hero card's shadow and the cobalt accent glow breathe very slightly with the bed, never waveform bars
- SFX posture: sparse and professional; a soft tap per simulated tap, a short pop for the verdict, one clean mark for the logo
- Audio-coupled moments: the three taps (tick on each press), the count roll 28 000 → 25 500 (soft ticks), the green verdict (short positive pop), the outro mark (single warm hit)
- Restraint rule: no whooshes on every cut, no cash-register clichés, no music drop that fights the last line

## Storyboard

### Scene 1 — The arithmetic — 3.0s
Full-frame cream `#FAF7F0`. A tiny cobalt uppercase label "JUSQU'À LA PAIE" fades in at the top third. The number "28 000" lands huge in navy (≈180 px, Inter 900), with "F" smaller beside it. At 1.2 s a second line lands below in muted navy: "9 jours. Combien par jour ?" Everything holds dead still until the cut.
Sequential/interaction: yes — number first, question line second.
Audio intent: establish warmth and a small tension (a question the viewer recognizes).
Audio-coupled idea: number lands on the music's opening beat; question line lands with a soft low tick.
Music: warm bed, present but uncluttered.
Transition mood: clean hard cut on the beat → Scene 2.

### Scene 2 — The answer — 2.8s
Same cream ground. The giant number is replaced by "3 100" in cobalt, with "F / jour" beneath in navy. A white pill card slides up holding the app's own line: "Tu peux dépenser environ 3 100 XAF aujourd'hui". The Spendly icon appears small at the top, so the answer is attributed immediately.
Sequential/interaction: yes — answer number, then pill card.
Audio intent: release the tension; this is the "oh, that's easy" beat.
Audio-coupled idea: number snaps in on the downbeat; pill card lands 0.35 s later with a soft card sound.
Music: same bed, no change.
Transition mood: soft vertical wipe → Scene 3.

### Scene 3 — The Today screen — 4.6s
The real Today screen recreated inside a phone-shaped white card on the cream page (no device chrome clutter): status row, "Bonsoir, Miguel", "À DÉPENSER" label, "28 000 XAF" big, "Tu peux dépenser environ 3 100 XAF aujourd'hui", category chips `Food · Transport · Airtime`, and the streak row "4 jours d'affilée". The card enters slightly large and settles; the rest of the cream page carries a faint cobalt glow behind it.
Sequential/interaction: yes — phone card settles, then the chips stagger in, then the streak row.
Audio intent: this is the product — calm confidence, no hype.
Audio-coupled idea: chips tick in on consecutive beats; the streak row lands with the last tick.
Music: groove continues.
Transition mood: clean cut into the action → Scene 4.

### Scene 4 — Three taps — 5.0s
Same phone card, now the centre of the frame. Tap 1: a cobalt ripple on the + button; the add sheet rises over the lower half. Tap 2: "Food" is selected in the category row. Tap 3: "2500" types into the amount field; the save button reads "Enregistrer 2 500 · Food" and is pressed. The sheet drops away and the Today number rolls 28 000 → 25 500 with a matching small tick; a caption at the bottom reads "Trois taps. C'est noté."
Sequential/interaction: yes — three simulated taps in order, each with a visual press state and a cursor finger dot.
Audio intent: satisfying, mechanical but soft; the rhythm of the three taps should feel like a habit.
Audio-coupled idea: one soft tick per tap; count-roll ticks under the number change; no sound on the sheet's exit.
Music: bed holds; taps land on alternate beats (≈10.9 / 12.0 / 13.1), not every beat.
Transition mood: hard cut on the settled number → Scene 5.

### Scene 5 — Before you spend — 3.2s
Cream page, a compact simulator card: title "Puis-je me le permettre ?", a line "Cinéma · 3 000 F", then a green verdict card "Ça rentre dans ton budget" with "Tu restes tranquille, c'est confortable." A small cobalt check mark draws itself.
Sequential/interaction: yes — title, cost line, verdict card in sequence.
Audio intent: a small, confident exhale; the answer is on your side.
Audio-coupled idea: verdict card lands with a short positive pop; the check draws in silence.
Music: bed continues, no drop.
Transition mood: soft crossfade with the green glow carrying over → Scene 6.

### Scene 6 — Outro — 3.4s
Cream page. The Spendly app icon (real asset) and the wordmark "Spendly" land together at 18.6 s. At 20.2 s the tagline "Ton argent, sans stress." lands below in navy, followed by the product line "Trois taps le soir. Une idée claire de ce que tu peux dépenser." in muted navy. A final small row: "FR · EN — Android · iOS — spendly.miguelyango.com". The music fades out under the last line; one warm mark rings as the wordmark lands.
Sequential/interaction: yes — icon + wordmark, tagline, product line, small footer row.
Audio intent: land the brand and leave a clean, warm silence.
Audio-coupled idea: wordmark on the 18.55 s strong cue; tagline on the 20.19 s strong cue; final fade 21.4 → 22.0 s.
Music: fade out.
Transition mood: end on a held frame.

**Music mood for this video:** warm upbeat business bed, human and unhurried
**Audio summary:** a friendly groove carries the arithmetic hook, ticks along with the three taps, exhales on the green verdict, and fades under a clean brand landing.
