# 🥾 Screaming Fred: The Tactical Chronicles

A **multiplayer MUD-style text adventure** set in Sentientworldia — where a tennis shoe named Fred goes on an absurd quest to find his stolen pasta and potatoes.

> *Based on "Fred's Adventure" by Timothy Wiradarma*

## ✨ What Is This?

An interactive fiction PWA where players explore a tactical 30×30 world through text commands. Each world tile contains a 5×5 sub-grid for high-detail interactions, NPC dialogues, item discovery, and turn-based combat. Players form parties of up to 3 for co-op exploration.

## 🎮 How to Play

Type commands into the terminal-style input:

| Command | Description |
|---|---|
| `look` / `l` | Examine your surroundings |
| `n` / `s` / `e` / `w` | Move north, south, east, or west |
| `interact <object>` | Open, search, or use an object |
| `talk` | Talk to an NPC on your tile |
| `scream` | Use Fred's Sonic Scream ability |
| `attack` | Attack an enemy on your tile |
| `inventory` / `i` | Check your inventory |
| `help` / `?` | Show all commands |

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Build | Vite 8 |
| UI | React 19 |
| State | Zustand 5 |
| Backend | Firebase (Firestore + Auth) |
| Styling | Vanilla CSS (dark terminal theme) |
| Deployment | Vercel |

## 🚀 Getting Started

```bash
# Clone and install
git clone https://github.com/awiradarma/screamingfred.git
cd screamingfred/app_build
npm install

# Run dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

## 📋 Implementation Phases

- [x] **Phase 1**: Solo Text Engine — command parser, room engine, 5×5 grid viewer, test room
- [ ] **Phase 2**: Multiplayer Party System — co-op via Firebase real-time sync
- [ ] **Phase 3**: 30×30 World Map — connected rooms, themes, fog-of-war
- [ ] **Phase 4**: No-Code Level Editor — community room creation
- [ ] **Phase 5**: Combat, AI & Polish — turn-based combat, boss fights, mobile optimization

## 📁 Project Structure

```
app_build/src/
├── engine/          # Pure-function game logic
├── data/            # Room JSON definitions
├── components/      # React UI (ChatLog, GridViewer, HUD)
├── store/           # Zustand state management
├── tests/           # Headless Node.js regression & playthrough tests
└── firebase/        # Firebase configuration
```

## 🧪 Testing & Regression Verification

Screaming Fred implements a robust, headless test bed that runs entirely in Node.js without browser dependencies. This setup acts as a deterministic regression testing suite for core game mechanics, room transitions, dialogues, and items.

### Running Tests
To execute verification and playthrough runs, navigate to the `app_build` directory and run:

```bash
# Run unit tests verifying dialogue skips, item actions, and balance fixes
node src/tests/test_fixes.js

# Run the full automated playthrough simulator for Chapter 1
node src/tests/run_full_playthrough.js
```

### Extensibility & Architecture
* **Pure Engine Integration**: The engine exposes pure functions (`initGameState` and `processCommand`) making commands fully deterministic and runnable under standard Node.js without mocking DOM/local storage.
* **Deterministic Seeding**: Tests can directly modify a mock state (e.g. setting coordinates or injecting items into the player's inventory) to instantly test late-game conditions in isolation.
* **Declarative Playbooks**: The playthrough suite uses a simple array of command steps. As new rooms or features are added, you can expand testing by simply declaring the new step expectations.
* **Procedural Synth Verification**: The procedural Web Audio synthesized BGM system replaces large external assets, meaning the regression test suite operates completely offline with zero flakey network timeouts.

## 📖 Lore

Fred is a white tennis shoe who discovers his pasta and potatoes have been stolen. With Freddista (a misunderstood boot) and Willy the Waffle (an expired detective), Fred journeys across Sentientworldia — from the Shoelace Forest to Breakfastopia to the Electric Desert — ultimately discovering that his nemesis Derf is actually his long-lost brother.

---

*Built with the Antigravity AI Developer Pipeline*
