# Technical Specification: Screaming Fred

## Executive Summary
Screaming Fred is a 2D Progressive Web Application (PWA) platformer and no-code level editor centered around an imaginative world called Sentientworldia. The game balances a high-fidelity 8-bit aesthetic with a zero-install web experience. Players control Fred—a white tennis shoe whose magical "scream" powers his journey—to retrieve his stolen lunch alongside eccentric companions. It features a continuous world map and a theme-locked User Generated Content (UGC) level editor to foster ongoing replayability.

## Narrative & Worldbuilding
The narrative is a core driving force of the gameplay and thematic design:
- **Plot**: Fred, shunned for his screaming in Shoeboxlandia, sets out to find his stolen lunch of pasta and potatoes. He teams up with Freddista (a misunderstood, loyal boot) and Willy the Waffle (an expired detective) to confront his long-lost brother, Derf. The entire conflict resolves through reconciliation rather than combat.
- **Regions**: Features surreal locations such as Breakfastopia (syrup rivers, bacon roads), Electric Desert, Textlandia (objects are literal text), and the Land of Creativity.
- **Absurd Logic**: Employs quirky mechanics like the Land of Endless Jumping powered by "expectation" and the 52-mile "Bridge of BLAAAAAAaaaah", which requires saying "blah" periodically.

## Requirements

### Functional Requirements
- **Gameplay Mechanics**: 
  - Standard 2D platforming logic.
  - **Scream Mechanic**: The Sonic Scream serves as both a defensive repulsion and an environmental activator (powering lanterns, revealing secrets).
  - **Rhythm/Prompt Events**: Mechanics for the "Bridge of BLAAAAAAaaaah" requiring timed button prompts to traverse.
  - **Physics Tweaks**: Implementation for the "Jump of Expectation" where jump metrics change dynamically.
  - **Transformations**: Ability for Fred to act/transform contextually, such as using "The Future Banana" as a bridge.
- **Adversaries & NPCs**: 
  - Hostile behaviors for Barry the Battery and Shoelace Snakes.
  - Dialog and companion behaviors for Freddista and Willy the Waffle.
- **Continuous World Map**: An SVG-based dynamic map covered in orange fog of war that shifts visual paths and clears upon consecutive level completion.
- **No-Code Level Editor (UGC)**: Browser-based level drafting mapped to theme-locked toolsets.
- **Publishing Pipeline**: Creator "Test Run" validation gate, then deployment to Firestore with a `pending` status. Requires administrative review of the level via a dedicated Admin Interface prior to public visibility.
- **Unified Input Engine**: 
  - **Desktop**: Native keyboard events (WASD/Arrows for movement, Space for jump, Shift/E for powers). Editor relies on a persistent mouse-driven sidebar palette. Game canvas uses a fixed 16:9 layout.
  - **Mobile (Touch)**: Virtual multi-touch overlay featuring a floating joystick and translucent glassmorphism action buttons. Editor uses space-saving collapsible bottom-sheets. Canvas dynamically fills `100vw/100vh`.

### Non-Functional Requirements
- **Zero-Install Experience**: Fully playable in the browser as a desktop and mobile PWA.
- **Persistence**: Graceful loading using `localStorage` for map state and `IndexedDB` for level drafts.
- **Performance**: Consistent 60FPS high-fidelity 2D render loop across standard mobile and desktop browsers.
- **Scalability & Expansibility**: The architecture and data schema (especially `SentientWorldia_Schema.json`) must be designed as extensible modules. Future sequels, new worlds, or additional mechanics must be supportable via modular data appends without requiring hard refactors of the deployed game engine.

## Security & Access Control
- **Frictionless Play**: The entire core game and continuous world map must be accessible to completely anonymous, unauthenticated users. They can play levels without maintaining an account.
- **Authentication Triggers**: Firebase Authentication is entirely optional, only triggering when a user wishes to:
  - Save their high scores on the global leaderboards.
  - Publish their own drafted sandbox levels to the public domain.
- **Admin Review Queue**: All newly submitted UGC levels are stored with `status: pending`. An authenticated Administrator role is required to access a dedicated, separate Admin Interface menu. Administrators must be able to load and "Test Play" the pending levels directly in browser before approving them for anonymous public consumption.

## Architecture & Tech Stack

- **Frontend / Container Framework**: **Vite + React.js**
  - Synthesizing the app requirements, a modern quick bundler like Vite paired with React is recommended to orchestrate the outer UI (menus, the Editor toolset panels, user accounts). It natively supports compiling into a robust PWA.
- **Game Engine**: **Phaser.js**
  - Encapsulated within a React component. It manages the Canvas rendering, physics engine (incorporating custom expectations and hitboxes), and the 8-bit audio system.
- **Backend & Auth**: **Firebase**
  - **Auth**: Manages anonymous sessions, promotes them to credentialed users for saving/publishing, and manages Admin privileges.
  - **Firestore**: Scalable document database to house the `SentientWorldia_Schema.json` level strings. Security Rules enforce that `pending` levels can only be read/approved by accounts with Admin claims.
- **Storage Strategy**:
  - `IndexedDB` handles heavy, auto-saving drafts to prevent lost work during intensive level editing.
  - `localStorage` instantly fetches localized states, such as the map's fog progression, for instant startup times.

### Game Entities Architecture
The Phaser engine logic will be encapsulated into modular, reusable Entity classes:
- **Fred (`Fred.js`)**: Encapsulates all player movement checking, precise gravity math, input listening, and jumping dynamics to keep the main scenes clean.
- **Sonic Ring (`SonicRing.js`)**: An ephemeral GameObject representing Fred's expanding scream attack. Spawns at his position, linearly scales its hitbox to overlap enemies, and self-destructs gracefully.

### Editor UI Architecture
The No-Code Level Editor relies on React seamlessly commanding the underlying Phaser canvas:
- **Palette Sidebar (`EditorPalette.jsx`)**: A collapsable glassmorphism UI listing available tools constrained by the actively selected narrative Theme (e.g., Pancake tiles for Breakfastopia).
- **Communication Bridge (`useStore.js`)**: Pipes the currently "selected" tile from the React Palette directly into the Zustand global store. Phaser subcribes to this store to handle mouse click placement events natively.
- **Persistence (`Storage Engine`)**: Instantly dumps the resulting `SentientWorldia_Schema.json` chunk into a local `IndexedDB` backend to prevent any data loss between testing and publishing.

### Continuous World Map (Overworld)
The Overworld acts as the structural glue bridging sandbox levels, implemented purely in React.
- **Routing Engine**: `App.jsx` dynamically toggles between the Overworld menu (`gameState === 'menu'`) and the Phaser engine (`gameState === 'playing'`).
- **SVG Navigation**: A visually responsive scalable graphic depicting the path from Shoeboxlandia to Textlandia.
- **Fog of War**: An orange structural mask rendering over future/unlocked nodes, lifting dynamically as `playerLevelProgress` in Zustand increases.

## State Management
- **Outer Application (React)**: Uses `Zustand` for globally accessing Auth State, active UI themes, and Player Progress.
- **Game Instance (Phaser)**: Controls self-contained engine execution (player physics, collisions, inputs, collected Pasta/Potatoes).
- **Editor Data Flow**: 
  1. The User operates the React Editor UI, writing level payload to `IndexedDB`.
  2. Executing a 'Test Run' bridges the `IndexedDB` JSON chunk directly into the `Phaser` Instance.
  3. Pre-flight success via `Phaser` validation activates the React-based 'Publish' API endpoint. 
  4. The client `POST`s the validated JSON schema to Firestore.
