# City of Tiny Promises

An HTML5 idle/management clicker game about civic responsibility and community building.

## Overview

**City of Tiny Promises** is a semantic systemic design game that distills complex themes of civic responsibility into an approachable, loop-based experience. Players tap to fulfill simple requests from citizens—WALK WITH ME, LISTEN, HELP MOVE BOXES—and watch as their community transforms based on their choices.

### Core Mechanic

You cannot help everyone. Ignoring requests slowly changes how the city looks and what people ask for. Late-game scenes visually communicate what kind of community your play created.

## Features

### Two Difficulty Levels

**New York City (Easy)**
- Classic urban experience with dark steel-gray skyscrapers
- Every request is genuine; the only opponent is the clock
- Responsive building colors based on community health

**San Francisco (Hard)**
- Distinctive tan/beige architecture with pyramid buildings
- Roughly a quarter of arrivals are requests that only look like requests,
  rising to about 40% by the end of the round
- Deceptive requests are drawn in the same palette and the same chrome as
  genuine ones. The tell is what is being asked for, not how it is drawn.

### Request Types

**Genuine Requests:**
- WALK WITH ME (🚶) - Companionship
- LISTEN (👂) - Emotional support
- HELP MOVE BOXES (📦) - Physical help
- SHARE MEAL (🍽️) - Community
- GIVE DIRECTIONS (🗺️) - Guidance
- CELEBRATE WITH ME (🎉) - Joy
- COMFORT ME (🤗) - Emotional care
- TEACH ME (📚) - Knowledge

**Deceptive Requests (SF only):**
- INVEST WITH ME (💰) - "Ground floor"
- HEAR ABOUT THEM (🗣️) - "Neighborhood news"
- KEEP THEM OUT (🚫) - "Community standards"
- HOLD MY CASH (💸) - "Trust exercise"
- COVER FOR ME (🏃) - "Just this once"
- SIGN THIS (📋) - "Formality"

Helping one costs you. Letting one expire is the correct read, and scores.

### Scoring

Two numbers, doing two different jobs.

**Score** is what you compete on, and is saved per city in `localStorage`:

| Outcome | Points |
| --- | --- |
| Genuine request helped | +10, multiplied by the streak bonus |
| Deception correctly let go | +5 |
| Genuine request missed | −10 |
| Deception fallen for | −15 |

Consecutive correct calls build a streak worth up to ×2.

**Community** (0–100) is the state of the city. It drives the buildings, the
health meter and the ending. Gains into it suffer diminishing returns, so the
last stretch of community trust is the expensive part, and consecutive misses
compound: a city you have stopped showing up for gives up on you faster.

If community reaches 0 the round ends early — the city stopped asking.

### Difficulty Curve

Spawn interval tightens from 2.6s to 1.1s and the street's capacity grows from
5 citizens to 10 over the 60-second round, so pressure comes from the schedule
rather than a flat rate.

### Controls

| Input | Action |
| --- | --- |
| Click, or Enter/Space on a focused citizen | Help that request |
| Tab, or arrow keys | Move between citizens |
| 1–9 | Act on that row of the queue, sorted most urgent first |
| P or Esc | Pause |
| M | Mute |
| R | Restart |

The game is fully playable without a mouse.

### Accessibility

- Citizens are real buttons, focusable and operable from the keyboard
- `aria-live` status region announces round, score and outcome changes
- Visible focus rings on every interactive element
- `prefers-reduced-motion` disables the pulse, float and particle animations;
  the countdown bars carry the same information
- The community meter is labelled for screen readers

### Audio System

- **Web Audio API**: Procedurally generated sounds (no external files)
- **Sound Effects**:
  - Fulfillment: Ascending three-note chime
  - Ignore: Descending three-note tone
  - Deception fallen for: Warning buzzer
  - Deception avoided: Short rising two-note cue
  - Game Over: Descending chord sequence
- **Background Music**: Difficulty-specific ambient tones
- **Controls**: Mute toggle and volume slider in the control bar (or M)

### Visual Design

- **Attract screen**: States the premise and the controls before play starts
- **Modern UI**: Glassmorphism effects, gradient backgrounds
- **Animated Citizens**: Color-coded request cards with names and descriptions
- **Particle Effects**: Heart particles for fulfillment, broken hearts for ignored requests
- **Full-Screen Cityscape**: NYC or SF skyline fills entire game area
- **Responsive Design**: Works on desktop and mobile, sized in `svh` so a
  collapsing mobile URL bar cannot push the control bar off-screen

## Gameplay

1. Choose a city
2. Citizens appear on the street with requests
3. Help them before their timer runs out — by clicking, or from the keyboard
4. In San Francisco, read the request before you help: some are not what they
   look like, and letting those expire is the right call
5. The round lasts 60 seconds, or ends early if community reaches 0
6. Your final community score determines the ending

## Technical Stack

- **HTML5**: Semantic markup
- **CSS3**: Gradients, animations, flexbox, grid
- **Vanilla JavaScript**: No frameworks or dependencies
- **Web Audio API**: Procedural sound generation

## Deployment

### Prerequisites

- GitHub account
- Netlify account (free tier available)
- Git installed locally

### Steps to Deploy

1. **Initialize Git Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: City of Tiny Promises game"
   ```

2. **Create GitHub Repository**
   - Go to https://github.com/new
   - Create a new repository named `city-of-tiny-promises`
   - Follow the instructions to push your local repository

3. **Connect to Netlify**
   - Go to https://app.netlify.com
   - Click "New site from Git"
   - Select GitHub and authorize
   - Choose your `city-of-tiny-promises` repository
   - Build settings:
     - Build command: `echo 'No build required'`
     - Publish directory: `.` (root)
   - Click "Deploy site"

4. **Automatic Deployments**
   - Every push to main branch automatically deploys
   - Preview deployments for pull requests

### Environment Variables

No environment variables required. The game is fully client-side.

### File Structure

```
city-of-tiny-promises/
├── index.html          # Main game HTML
├── styles.css          # All styling
├── game.js             # Game logic and audio system
├── package.json        # Project metadata
├── netlify.toml        # Netlify configuration
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Local Development

To run locally:

```bash
python -m http.server 8000
# or
npm start
```

Then open http://localhost:8000 in your browser.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Game Design Notes

### Semantic Systemic Design

The game uses visual and mechanical feedback to communicate systemic consequences:
- **Visual**: Buildings reflect community health through color and opacity
- **Audio**: Different sounds for positive/negative actions
- **Mechanical**: Bad requests have negative impacts, good requests have positive impacts
- **Narrative**: End-game text describes the community you created

### Civic Responsibility Theme

The game distills complex civic themes into simple mechanics:
- Individual choices accumulate into community outcomes
- You cannot help everyone; choices have consequences
- Ignoring needs damages community trust
- Small acts of kindness compound over time

## Future Enhancements

- Leaderboard system
- Additional difficulty levels
- More request types and citizen variety

## License

MIT License - Feel free to use this game for educational or commercial purposes.

## Credits

Designed and developed as a semantic systemic design game exploring civic responsibility and community building.

---

**Play the game**: deploy with the steps above, then drop your Netlify URL here.
