# Technical Specification: Screaming Fred (Phase 2 - Advanced Mechanics & UGC)

## Executive Summary
Building upon the v0.1.0 Core Engine, Phase 2 focuses on expanding Fred's capabilities, implementing region-specific enemy AI, and finalizing the community-driven publishing pipeline. The goal is to transition from a single-player greybox prototype to a content-rich, socially connected platforming experience.

## Requirements

### Functional Requirements
- **Advanced Gameplay Mechanics**: 
  - **The Future Banana Transformation**: Fred can now transform into a "Future Banana" (Static Object) to serve as a bridge over hazardous syrup or electric puddles. This state consumes "Creativity Meter" and makes Fred immobile but invulnerable.
  - **Scream-Activated Triggers**: Environmental objects (e.g., Microphone Lanterns, Scream-activated Doors) that toggle state when the Sonic Ring hitbox overlaps them.
- **Specific Adversaries**: 
  - **Barry the Battery**: Stationary enemy that emits a 360-degree electric zap every 3 seconds. Movement is triggered if Fred screams near him.
  - **Shoelace Snakes**: Ground-based patrol enemies that hiss and accelerate towards Fred if he enters their line-of-sight.
- **UGC & Social Integration**:
  - **Firestore Level Publishing**: Validated level schemas can be published directly to Firestore.
  - **Community Browser**: A menu listing "Approved" levels from other creators, ranked by "Creativity Gained" votes.
  - **Global Leaderboards**: Top scores for each level (Pasta/Potato count + Time) synced to Firestore.

### Non-Functional Requirements
- **Data Integrity**: Security Rules for Firestore to ensure only "Approved" levels appear in the community browser.
- **State Persistence**: Syncing high scores and unlocked skins across devices via Firebase Auth.

## Architecture & Tech Stack (Updates)

### Transformations (`TransformationManager.js`)
A new system integrated into `Fred.js` to handle state transitions.
- **States**: `NORMAL`, `BANANA`.
- **Logic**: Transitioning to `BANANA` replaces the physics body with a static rectangle that other entities (like companions or projectiles) can walk/bounce on.

### Enemy AI Suite (`enemies/`)
Moving beyond placeholder rectangles to specialized classes:
- `Barry.js`: Implements proximity-based zap cycles.
- `Snake.js`: Implements AABB line-of-sight checks and patrol pathing.

### Firestore Integration (`firebase/levels.js`)
Service layer to handle CRUD operations for levels:
- `publishLevel(schema)`: Writes to `levels/` with `status: 'pending'`.
- `fetchCommunityLevels()`: Queries Firestore for `status === 'approved'`.

## State Management (Zustand Updates)
- `communityLevels`: Array of levels fetched from Firestore.
- `highScores`: Map of level IDs to leaderboards.
- `creativityMeter`: Value representing Fred's energy for transformations.

## Verification Plan
### Automated Verification
- **Unit Tests**: Test `TransformationManager` state transitions.
- **Integration Tests**: Verify level publishing flow using Firebase Emulator (if available) or mock service.

### Manual Verification
1.  **Transformation Test**: Trigger Banana mode in Breakfastopia and walk across a syrup pit.
2.  **Enemy Test**: Approach Barry and observe the zap timing.
3.  **Publishing Test**: Create a level in the editor, "Test Run" it, and click "Publish". Verify its appearance in the "Pending Review" log.

Do you approve of this tech stack and specification for Phase 2? You can safely open `Technical_Specification.md` and add comments or modifications if you want me to rework anything!
