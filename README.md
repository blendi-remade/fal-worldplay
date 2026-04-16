# WorldPlay

Generate AI worlds. Create 3D characters. Step inside and explore.

WorldPlay combines [World Labs](https://worldlabs.ai) world generation with [Meshy](https://www.meshy.ai/) 3D character creation (via [fal.ai](https://fal.ai)) to let you generate immersive 3D environments and playable rigged characters, then walk around inside them in your browser.

## Screenshots

### Generated World

<!-- Drag and drop your world screenshot here -->
<img width="1414" height="956" alt="Screenshot 2026-04-16 131915" src="https://github.com/user-attachments/assets/e50467fc-3338-424c-8130-a0d032cb3888" />


### Generated Character

<!-- Drag and drop your character screenshot here -->
<img width="1219" height="1029" alt="Screenshot 2026-04-16 131926" src="https://github.com/user-attachments/assets/ad2a7f01-2616-45f9-8a8b-b4427058e091" />

### Character in the World

<!-- Drag and drop your gameplay screenshot here -->
<img width="2859" height="1497" alt="Screenshot 2026-04-16 132529" src="https://github.com/user-attachments/assets/8e9f01a2-a283-4193-a21f-0560d10ed175" />

## How It Works

1. **Describe a world** using text, a reference image, or both. World Labs generates a full 3D environment as Gaussian splats.
2. **Describe a character** using text or upload an image. Meshy v6 generates a textured, rigged 3D model with walking and running animations.
3. **Preview** both side by side. Orbit and zoom into the world to explore.
4. **Place your character** inside the world using XYZ position and scale sliders.
5. **Play** in third-person with WASD movement, mouse look, scroll zoom, and adjustable speed.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Three.js** for 3D rendering and character animation
- **SparkJS** for Gaussian splat rendering (by World Labs)
- **World Labs API** for world generation (marble-1.1 / marble-1.1-plus models)
- **Meshy v6 on fal.ai** for text-to-3D and image-to-3D with auto-rigging
- **fal.ai client** for job submission and polling
- UI styled with the [fal design system](https://fal.ai)

## Getting Started

### Prerequisites

- Node.js 18+
- A [World Labs](https://worldlabs.ai) API key
- A [fal.ai](https://fal.ai) API key

### Setup

```bash
git clone https://github.com/blendi-remade/fal-worldplay.git
cd fal-worldplay
npm install
```

Create a `.env.local` file in the project root:

```
WLT_API_KEY=your_worldlabs_api_key
FAL_KEY=your_fal_api_key
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

### World Generation
- Text-to-world or image-to-world via World Labs
- Multiple quality levels (marble-1.1 for speed, marble-1.1-plus for quality)
- Configurable splat resolution (500k or full res)
- Gaussian splat rendering with SparkJS

### Character Generation
- Text-to-3D or image-to-3D via Meshy v6 on fal.ai
- Auto-rigging with T-pose
- Walking and running animations included
- PBR textures (base color, metallic, roughness, normal)
- Configurable polycount (5k to 50k)

### Gameplay
- Third-person camera with WASD movement and mouse look
- Walk and run (hold Shift)
- Scroll to zoom camera in/out
- `[` and `]` to adjust movement speed
- Visual character placement with XYZ sliders and scale control

### Quality of Life
- Generation history saved to localStorage (up to 10 worlds and 10 characters)
- Mix and match: pick a world from history and generate a fresh character, or vice versa
- Both from history skips straight to preview with zero wait
- Advanced settings for world model, splat quality, character polycount, and render quality

## Project Structure

```
src/
  app/
    page.tsx                    Main app, phase-based rendering
    layout.tsx                  Root layout
    globals.css                 fal design system CSS variables
    api/
      generate-world/           POST: World Labs generation
      world-status/             GET: poll operation status
      generate-character/       POST: Meshy submit (text or image)
      character-status/         GET: poll fal queue
      upload-image/             POST: World Labs media asset upload
  components/
    LandingHero.tsx             Two-step prompt flow with history
    GeneratingView.tsx          Live status with fal spinner
    PreviewPanel.tsx            Side-by-side world + character preview
    PlacementView.tsx           XYZ + scale sliders for character placement
    GameplayView.tsx            Third-person gameplay
    WorldViewer.tsx             SparkJS splat renderer with orbit controls
    CharacterViewer.tsx         Three.js GLB viewer with animations
    HistoryDropdown.tsx         Custom dropdown for generation history
    FalLogo.tsx                 fal logo SVG + animated spinner
  lib/
    types.ts                    TypeScript types and settings
    hooks.ts                    useAppState hook (generation, polling)
    history.ts                  useHistory hook (localStorage persistence)
    constants.ts                API endpoints and model defaults
```

## Controls

| Input | Action |
|-------|--------|
| WASD | Move |
| Shift | Run |
| Mouse | Look around |
| Scroll | Zoom camera in/out |
| `[` | Slow down |
| `]` | Speed up |
| Esc | Exit gameplay |

## Credits

Built with [fal.ai](https://fal.ai), [World Labs](https://worldlabs.ai), and [Meshy](https://www.meshy.ai/).
