# Voices and lobby music for Crawford Creative Suites

Make each line below with your ElevenLabs voice (or record it yourself). Save it as an **MP3** with the **exact file name** shown, and put it in this `audio` folder. Each file starts working on its own as soon as it's in place. A line without a file stays silent; the device's robotic voice is not used.

**Voices (chosen by Tanika; receptionists and elevator Nov 27, 2026):** each person in the building has her own voice, saved under My Voices in ElevenLabs. The full line list for every voice is in `VOICE-SCRIPT.md`.

| Who | Voice | Lines |
|---|---|---|
| Lobby concierge (Floor 1) | **Veda Sky** (Expressive Customer Service). Speed 1.08 for the four replies (her greeting is her own download), stability 50, similarity 75, style 0 | `greeting`, `reply-*`, `faq-*` |
| Madam Allure receptionist (Floor 2) | **Kai** (Real AI Receptionist), the softest voice, for beauty and self-care | `welcome-217`, `lounge-powder`, `r217-*` |
| Allure Fusions receptionist (Floor 3) | **Bhee** (Tanika's choice, Nov 28; replaces Maya) | `welcome-305`, `lounge-maker`, `r305-*` |
| AI AuthoriTech receptionist (Floor 4) | **Tanika_Real**, Tanika's own voice (Nov 28; replaces Tiffany) | `welcome-412`, `lounge-clarity`, `r412-*` |
| Elevator | **Blake Harlow**, floor announcements only | `floor-2` to `floor-4` |

Use the same settings for every line of one voice so they match. Type suite numbers the way they are said (two-seventeen, three-oh-five, four-twelve) so the voice does not read "two one seven".

Tips: keep a short natural pause at the start and end, use the same voice and settings for every line, and keep each file under 1 MB.

## Lobby concierge

| File name | What she says |
|---|---|
| `greeting.mp3` | Welcome to Crawford Creative Suites. How may I direct you today? Tell me what you are looking for, or choose a destination on the directory. |
| `reply-217.mp3` | Madam Allure is the perfect destination for beauty, fragrance, self-care, memorial creations, and personalized gifts. You'll find it in Suite 217 on Floor 2. |
| `reply-305.mp3` | Allure Fusions is the perfect destination. It is where bold design and beauty fuse. You'll find it in Suite 305 on Floor 3. |
| `reply-412.mp3` | AI AuthoriTech is the right destination for AI strategy, automation, custom agents, and digital transformation. You'll find it in Suite 412 on Floor 4. |
| `reply-unknown.mp3` | I couldn't quite place that. Try the directory, or tell me what kind of business you need. |

## Elevator (plays as the car arrives, before the doors open)

| File name | What it says |
|---|---|
| `floor-2.mp3` | Floor two. Madam Allure. |
| `floor-3.mp3` | Floor three. Allure Fusions. |
| `floor-4.mp3` | Floor four. AI AuthoriTech. |

## Receptionists (play when the elevator doors open)

| File name | What she says |
|---|---|
| `welcome-217.mp3` | How may I help you today? (skipped when the concierge sent the visitor up) |
| `welcome-305.mp3` | How may I help you today? (skipped when the concierge sent the visitor up) |
| `welcome-412.mp3` | How may I help you today? (skipped when the concierge sent the visitor up) |

## Lounges (play when a visitor walks in)

| File name | What she says |
|---|---|
| `lounge-powder.mp3` | Welcome to the Powder Room, a quiet place to explore beauty rituals, fragrance, and self-care. |
| `lounge-maker.mp3` | Welcome to the Designer Lounge, where ideas, materials, and technology come together. |
| `lounge-clarity.mp3` | Welcome to the AI Clarity Lounge, a practical space for separating AI facts from hype. |

## Lobby music

| File name | What it is |
|---|---|
| `lobby-music.mp3` | Your Suno track. It loops softly in the lobby only and fades out when the visitor takes the elevator. An instrumental with a smooth loop works best; keep it under about 4 MB. |

If you want different words, change them in your recording. To change the on-screen text too, tell Claude which lines changed.

## Lobby concierge answers (FAQ)

The concierge answers common questions from `build/faq.js`. Each answer plays `faq-<id>.mp3` (Veda Sky, speed 1.08) once it is recorded; until then the answer shows on screen only. The full list, with sample questions, is in OneDrive › Work Notes › Concierge Answers - review.

## Nov 27, 2026: full recording script and receptionist answers

- **Every line, grouped by voice, with its file name:** `audio/VOICE-SCRIPT.md` (122 lines). It is generated from the site's answer lists with `node build/voice-script.mjs`, so never edit it by hand. A copy with Copy buttons is in OneDrive › Work Notes › ElevenLabs Voice Script.html.
- **Receptionists now have their own answer lists and their own recordings:** files are named `r217-…`, `r305-…`, `r412-…` (for example `r305-small-prints.mp3`), so each answer plays in that receptionist's voice. The answer list is also in Notion: Agent Handoff Hub › Receptionist Knowledge Base.
- **Elevator chime:** `elevator-chime.mp3`, a softer modern bell (option A). Options A, B and C are in OneDrive › Work Notes › Elevator chime options. Replace this file to change the sound.
- **Local preview only:** on 127.0.0.1 every line that is not recorded yet is read by the computer's voice, so the whole flow can be heard before recording. The live site stays silent for unrecorded lines (except the elevator and receptionist welcome, as before).
