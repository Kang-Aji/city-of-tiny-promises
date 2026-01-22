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
- 8 positive request types
- Straightforward gameplay focused on fulfilling requests
- Responsive building colors based on community health

**San Francisco (Hard)**
- Distinctive tan/beige architecture with pyramid buildings
- Mix of 8 positive and 5 negative "bad requests" (30% spawn rate)
- Strategic decision-making: identify and avoid harmful requests
- Deceptive requests like "BUY MY PRODUCT", "SPREAD RUMORS", "TAKE MY MONEY"

### Request Types

**Positive Requests:**
- WALK WITH ME (🚶) - Companionship
- LISTEN (👂) - Emotional support
- HELP MOVE BOXES (📦) - Physical help
- SHARE MEAL (🍽️) - Community
- GIVE DIRECTIONS (🗺️) - Guidance
- CELEBRATE WITH ME (🎉) - Joy
- COMFORT ME (🤗) - Emotional care
- TEACH ME (📚) - Knowledge

**Negative Requests (SF Only):**
- BUY MY PRODUCT (💰) - Scam
- SPREAD RUMORS (🗣️) - Gossip
- IGNORE THEM (🚫) - Exclusion
- TAKE MY MONEY (💸) - Theft
- SKIP WORK (🏃) - Irresponsibility

### Systemic Design

- **Community Score**: Ranges from 0-100, starts at 50
- **Visual Feedback**: Buildings change appearance based on community health
  - Score < 30: Dark, depressed buildings
  - Score 30-70: Neutral appearance
  - Score > 70: Bright, vibrant buildings
- **Four Ending Scenarios**: Based on final community score
  - 80+: Thriving community
  - 60-79: Balanced community
  - 40-59: Struggling community
  - <40: Broken down community

### Audio System

- **Web Audio API**: Procedurally generated sounds (no external files)
- **Sound Effects**:
  - Fulfillment: Ascending three-note chime
  - Ignore: Descending three-note tone
  - Bad Request: Warning buzzer
  - Game Over: Descending chord sequence
- **Background Music**: Difficulty-specific ambient tones
- **Controls**: Mute button and volume slider in header

### Visual Design

- **Modern UI**: Glassmorphism effects, gradient backgrounds
- **Animated Citizens**: Color-coded request cards with names and descriptions
- **Particle Effects**: Heart particles for fulfillment, broken hearts for ignored requests
- **Full-Screen Cityscape**: NYC or SF skyline fills entire game area
- **Responsive Design**: Works on desktop and mobile devices

## Gameplay

1. Choose a difficulty level (NYC or San Francisco)
2. Citizens appear on the street with requests
3. Click citizens to fulfill their requests before time runs out
4. Each request has a timer (8-12 seconds depending on urgency)
5. Fulfilling requests increases community score
6. Ignoring requests decreases community score
7. Game lasts 60 seconds
8. Final community score determines ending scenario

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

- Persistent save system (localStorage)
- Leaderboard system
- Additional difficulty levels
- More request types and citizen variety
- Accessibility improvements (ARIA labels, keyboard controls)
- Mobile touch optimizations

## License

MIT License - Feel free to use this game for educational or commercial purposes.

## Credits

Designed and developed as a semantic systemic design game exploring civic responsibility and community building.

---

**Play the game**: [City of Tiny Promises on Netlify](https://your-netlify-domain.netlify.app)
