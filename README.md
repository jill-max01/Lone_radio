> Made by .lone17 with ❤️

# 🎵 Lone Radio

A premium vehicle radio system for FiveM. Stream live radio stations, YouTube, and custom URLs with a stunning infotainment UI, vehicle audio occlusion, and per-player radio persistence.

> **Standalone** — Works with QBCore, ESX, or any framework. No framework dependency required.

## ⚡ Features

- **Infotainment UI** — OLED-inspired car stereo interface with wallpapers, themes, and customizable mini-radio widget
- **Live Streaming** — Supports direct audio streams and YouTube URLs
- **Immersive Tuner Mode** — Scroll through FM frequencies with realistic white noise static and station snapping
- **Vehicle Audio Occlusion** — Clear audio for passengers, muffled + reduced volume for players outside the vehicle
- **Radio Persistence** — Radio follows the player between vehicles (admin-configurable, player-toggleable)
- **Synced Playback** — All nearby players hear the same radio from a vehicle via State Bags
- **Mini-Radio Widget** — Draggable floating OLED display with 5 frame styles (Hardware, Glass, Solid, Transparent, Neon)
- **Fully Customizable** — Accent colors, wallpaper backgrounds, widget scaling, and more
- **Powered by oliSound** — Web Audio API engine, zero external dependencies, low latency

## 📦 Dependencies

- [olisound](https://github.com/lone17k/olisound) — High-performance audio library for FiveM
- Any FiveM server (QBCore, ESX, standalone — no framework APIs used)

## 🚀 Installation

1. Drop `Lone_radio` into your resources folder
2. Ensure `olisound` is installed and started before this resource
3. Add to your `server.cfg`:

```
ensure olisound
ensure Lone_radio
```

4. Configure stations in `shared/config.lua`

## ⚙️ Configuration

```lua
Config = {}

Config.command = "radio"           -- Chat command to open the radio menu

-- When true, radio persists when player exits vehicle
-- and auto-plays in the next vehicle they enter.
-- Players can individually disable this from the radio settings UI.
Config.persistRadio = true

Config.Radios = {
    { name = "Station Name", url = "https://stream-url.com/stream", freq = 88.5 },
    { name = "YouTube Radio", url = "https://www.youtube.com/watch?v=VIDEO_ID", freq = 92.1 },
}
```

### Adding Stations

Each station requires:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name shown in the UI |
| `url` | string | Direct stream URL or YouTube link |
| `freq` | number | FM frequency for Tuner Mode (87.5–108.0) |

## 🎮 Usage

| Action | How |
|--------|-----|
| Open radio menu | Type `/radio` in chat (or your configured command) while in a vehicle |
| Select a station | Click any station icon in the grid |
| Adjust volume | Use the volume slider at the bottom |
| Pause | Click the Pause button |
| Tuner Mode | Click the dial icon next to the search bar |
| Close menu | Press `Escape` |
| Move mini-radio | Click and drag the floating widget |

## 🔊 Audio Behavior

| Scenario | Audio |
|----------|-------|
| Inside vehicle with radio | Clean, full volume |
| Outside vehicle (sealed) | Muffled + 30% volume |
| Enter new vehicle (persist ON) | Radio auto-plays your last station |
| Enter vehicle with existing radio | Syncs to that vehicle's radio |
| Press Pause | Radio stops, does not persist |

## 🎨 Customization (In-Game Settings)

- **Wallpaper** — Choose from preset backgrounds or paste a custom image URL
- **Widget Frame Style** — Hardware, Glass, Solid, Transparent, Neon
- **Accent Color** — 6 preset colors for the mini-radio glow
- **Widget Scale** — Resize the floating mini-radio (0.5x – 2.0x)
- **Mini Radio Overlay** — Toggle visibility of the floating widget
- **Active Radio Text** — Show/hide station name on the mini LCD
- **Keep Radio Between Vehicles** — Toggle per-player radio persistence
- **Widget OLED Wallpaper** — Custom background image for the mini-radio screen

All settings are saved per-player in browser localStorage and persist across sessions.

## 📁 File Structure

```
Lone_radio/
├── fxmanifest.lua              # Resource manifest
├── shared/
│   └── config.lua              # Stations, command, admin config
├── client/
│   └── main.lua                # Audio engine, muffle, vehicle tracking
├── server/
│   └── main.lua                # State bags, player radio persistence
└── web/
    ├── src/
    │   ├── App.tsx             # React UI (infotainment + mini-radio)
    │   └── index.css           # OLED styling
    └── dist/                   # Production build (served to NUI)
```

## 📜 License

See [LICENSE](LICENSE) for details.

> Feel free to report issues and contribute to the project.
