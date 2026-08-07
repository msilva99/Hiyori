# Hiyori

Hiyori is a Japanese study app — flashcards with spaced repetition, a daily journal that highlights words in your decks, kana typing drills if you're still learning kana, and routines that chain your study sessions together. Made by [Maria Silva](https://github.com/msilva99).

Try the demo at [jp.msilva.dev](https://jp.msilva.dev), or download the desktop app below.

## Features

**Decks & Flashcards**
- Create decks by hand, or import one from a JSON file (`{ title, cards: [{ kanji, kana, romaji, meaning }] }`, or just a bare array of cards)
- Add, edit, and bulk-edit or bulk-delete cards
- Export any deck back to JSON

**Study**
- If you're unfamiliar with the kanji, toggle Always Show Kana, but to me personally, leaving it off helps to practice recognition of kanji without always seeing the kana. You can show kana for each card individually
- Custom Study sessions with spaced repetition (SM-2-style) — pick your decks and word count, and only due cards show up
- Test mode — a way to check-in that doesn't mess with your review schedule, with progress that saves automatically if you close the tab or leave mid-test and come back later (I made it this way so I can test how many of the JLPT words I know for my current level)

**Routines**
- Here you can chain Study steps and Test steps into one flow (e.g. "quiz me, then test me on the same deck"), so you don't have to reconfigure each one separately
- I think there's different possible uses for this, but I will personally use it for different energy level routines, as well as verbs / adjectives / JLPT categorized routines
- Mark one routine active and start it from the Home page

**Journal**
- Write daily entries in Japanese, the words that match your decks get highlighted, with a tooltip showing the reading and meaning
- Click on the date to see the entry history tab, entries are searchable by month and year

**Kana Practice**
- Typing drills for hiragana and katakana, including combination sounds (きゃ, しゅ, etc.)

**Also**
- Daily streak and goal tracking on the Home screen (this may change in the future)
- Light/dark mode
- Self-hostable, or available as a native desktop app (Windows, with auto-update)

**Coming soon:** Dictionary, Insights, and an AI Tutor.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## Desktop app

Hiyori is also packaged as a desktop app with [Tauri](https://tauri.app). Run `npm run tauri:dev` to launch it locally, or `npm run tauri:build` to produce an installer.

## License

[MIT](LICENSE)
