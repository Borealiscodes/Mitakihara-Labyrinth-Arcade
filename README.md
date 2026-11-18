> ### ✅ RELEASE v1.2.1 — PLAYABLE ZERO-FLOAT ARCADE EDITION (`5/5` PASSING)
> **Status:** `v1.2.1` Live & Verified • Zero-Float `Q16.16` 60 Hz Browser Bullet-Hell  
> 
> **Release Highlights (Nov 2026):** All core arcade milestones (`v0.1`–`v1.2.1`) are live and verified (`node --test`: **5/5 passing**). Features touch-drag & WASD controls, 5 playable Magical Girls with unique Ultimates, 3 Boss Witch encounters (**Charlotte**, **Oktavia**, **Walpurgisnacht**), 4 difficulty tiers, and a WebAudio soundtrack switcher (**D-Minor Baroque Symphonic Waltz** & **Dark Techno**).

# ✨ Mitakihara Labyrinth Arcade — Zero-Float Casual Action Game

**A fast-paced, touch-friendly `60 Hz` browser bullet-hell shooter built on [`Spectral-Labyrinth-Engine`](https://github.com), translating bit-exact `Q16.16` fixed-point math into magical-girl arcade combat.**

---

## 🎮 Arcade Mechanics & Roster

* **🎯 Controls:** Touch-and-drag or `WASD` / Arrow keys for movement; auto-fire runs at `60 Hz` (`Spacebar` / HUD button triggers Ultimates at `100` Hope Energy).
* **💎 Core Meters:** Soul Gem Purity (`HP`), Hope Energy (`Mana`), and Despair Corruption (vented via Grief Seeds).
* **✨ Playable Characters:** Madoka Kaname, Homura Akemi, Mami Tomoe, Kyoko Sakura, and Sayaka Miki, each equipped with distinct weapon spreads and signature Ultimate abilities.
* **🦋 Boss Witches:** Encounters every 5 waves featuring Charlotte, Oktavia von Seckendorff, and Walpurgisnacht.
* **🔥 Difficulty Tiers:** Casual, Standard, Nightmare, and Walpurgisnacht (scaling speed, HP, and spawn rates).
* **🎻 Audio Engine:** Zero-dependency WebAudio switcher featuring Muted, Symphonic Waltz, and Dark Techno tracks.

---

## 📁 Repository Structure

```text
Mitakihara-Labyrinth-Arcade/
├── index.html                        # Zero-bundler arcade viewport & HUD (v1.2.1)
├── style.css                         # Dark-mode arena & HUD styling
├── package.json                      # Zero-dependency ESM manifest
├── LICENSE                           # MIT License
├── README.md                         # Arcade guide & release roadmap
├── src/
│   ├── core.js                       # Q16.16 fixed-point math & PRNG
│   ├── arcade-physics.js             # 60 Hz kinematics & hitboxes
│   ├── arcade-entities.js            # Characters, bosses & difficulty scalers
│   ├── arcade-renderer.js            # 2D Canvas entity & HUD renderer
│   ├── arcade-audio.js               # WebAudio soundtrack & SFX engine
│   ├── arcade-ui.js                  # Live HUD & meter updaters
│   └── arcade-app.js                 # 60 Hz game loop & input dispatcher
└── test/
    └── arcade-physics.test.mjs       # Deterministic collision tests (5/5 passing)
```

---

## 🚀 Quickstart & Verification

```bash
# 1. Run deterministic Q16.16 collision, boss & difficulty tests
node --test test/arcade-physics.test.mjs

# 2. Serve locally and open http://localhost:8080
python3 -m http.server 8080
```

---

## 🛠️ Completed Roadmap (`v0.1` → `v1.2.1`)

* **`v0.1` – `v1.2.1` — Complete ✅:** Encompasses core `Q16.16` physics, character rosters, Multi-phase Boss Witch encounters, `5/5` test verification, and the WebAudio sound engine.

---

## ⚠️ Non-Commercial Fan Tribute & Acknowledgements

A non-commercial open-source fan project based on *Puella Magi Madoka Magica*, incorporating code and concepts from [`Borealiscodes/Spectral-Labyrinth-Engine`](https://github.com), [`EternitiesAi/eternities-firstlight`](https://github.com), and Flyxion (`@standardgalactic`). Licensed under the MIT License.
