## Meteor Madness — Asteroid Impact Simulator

Interactive visualization and modeling tool for NASA Space Apps 2025 challenge. It fetches real Near-Earth Objects (NEOs) from NASA's NeoWs API, lets you tweak entry parameters, runs a simplified atmospheric entry simulation with drag and gravity, visualizes Earth and the asteroid in 3D, and logs estimated consequences (impact energy, crater size, speed loss, etc.).

### Setup
1. Copy `.env.example` to `.env` and set `VITE_NASA_API_KEY`.
2. Install deps:
   ```powershell
   npm install
   ```
3. Run dev server:
   ```powershell
   npm run dev
   ```
4. Open `http://localhost:5173/` (Vite will auto-pick a new port like `5174` if busy).

### Notes
- 1 scene unit equals 1 Earth radius. Positions are in an Earth-centered frame for simplicity.
- Physics model is intentionally simplified for realtime viz and educational use. Not suitable for safety-critical analysis.
- Geodesy and distances are now modeled on the WGS84 ellipsoid with precise LLH↔ECEF transforms and Vincenty geodesics (see `src/utils/geodesy.ts`).
- Earth uses a lightweight default material for stability. You can enable the advanced Earth (day/night, city lights, normal/specular, subtle rim, cloud shadows) via the toggle in the UI. Clouds and an atmosphere rim glow are optional too.
- Use the "Упростить эффекты" toggle on low-power GPUs to reduce particle counts and visuals.
- Bloom postprocess can be enabled with the "Bloom" toggle and intensity slider.
- Target the impact timing using "Время до удара (с)"; the sim auto-calibrates visual speed for ~that time and gently corrects at runtime.

### Controls
- `Запустить симуляцию` — start with current parameters
- `Повторить` — restart quickly with the same parameters
- Presets: Малый / Челябинск / Крупный
- Visual toggles: Упростить эффекты, Продвинутая Земля, Облака, Атмосфера, Bloom (+ яркость)
- Physics/time: Время до удара (с) for target seconds to impact

### Troubleshooting
- If you started the server from the parent folder by accident, stop it and run from the project folder `met-app`.
- If port `5173` is taken, Vite will show a new port in the terminal (e.g., `5174`). Open that one.
- If you see "WebGL context lost", keep effects simplified and bloom off; the app adds guards to prevent default loss behavior and recover.

### Key files
- `src/services/nasa.ts` — NASA NeoWs API client
- `src/utils/physics.ts` — Physics helpers (drag, gravity, impact estimations)
- `src/utils/geodesy.ts` — High-accuracy WGS84 coordinate transforms and geodesic distances
- `src/utils/coordinates.ts` — App-facing coordinate helpers delegating to geodesy
- `src/store/useScenarioStore.ts` — Zustand store for scenario and simulation state
- `src/components/three/Earth.tsx` — Advanced 3D Earth (day/night, lights, normal/specular, rim, cloud shadows)
- `src/components/three/Asteroid.tsx` — 3D Asteroid
- `src/App.tsx` — UI and scene wiring
 - `src/components/three/SimpleEarth.tsx` — Lightweight Earth used by default for stability
 - `src/components/three/Atmosphere.tsx` — Rim glow atmosphere (optional)
 - `src/components/three/Clouds.tsx` — Lightweight cloud layers (optional)
 - `src/components/three/ExplosionParticles.tsx`, `Shockwave.tsx`, `CraterMark.tsx`, `DustBillboard.tsx`, `TrajectoryTrail.tsx` — impact visuals

### Scientific methodology

- Coordinates: All lat/lon/alt use WGS84. LLH→ECEF uses closed-form with prime vertical radius; ECEF→LLA uses an iterative solver converging within 10 iterations. Roundtrip error is validated to < 5 m.
- Distances: Geodesic distances use the Vincenty inverse algorithm. For quick checks we still expose haversine but default to Vincenty in app logic.
- Targeting: The app includes “🎯 Точное попадание” (pre‑compensation) and optional “🔒 Принудительная точность” for demonstrations that require exact strike placement.
- Tests: Vitest unit tests verify conversions and distances (`src/utils/__tests__`).

### Scripts

- `npm run test` — run unit tests
- `npm run typecheck` — strict TypeScript build without emit

