# Guloogulu 🎯
### The Search Engine That Refuses to Let You Type

## Basic Details

**Team Name:** [Byte me]

### Team Members

- **Team Lead:** [Vedika vinod] - [RIT,KOTTAYAM]
- **Member 2:** [Aswathy Karun] - [RIT,KOTTAYAM]


---

## Project Description

Guloogulu is a completely unnecessary Google-inspired search engine where typing with a keyboard is forbidden.

Instead, users have to enter their search query by blinking their eyes in Morse code. Just when they think they've successfully searched something, Guloogulu may randomly malfunction, scramble their carefully typed query, or punish them for attempting to close it incorrectly.

---

## The Problem (that doesn't exist)

Typing is too convenient.

Humans have become dangerously dependent on keyboards for entering text. Guloogulu addresses this completely imaginary crisis by removing normal typing and forcing users to communicate with a search engine through eye blinks and Morse code.

Because apparently, searching something wasn't difficult enough already.

---

## The Solution (that nobody asked for)

Guloogulu replaces keyboard typing with **blink-based Morse code input**.

The webcam continuously observes the user's eyes and detects eye closures using computer vision and **Eye Aspect Ratio (EAR)** based blink detection.

- 👁️ **Short blink** → Morse dot `.`
- 👁️ **Long blink** → Morse dash `-`
- ⏱️ **Pause** → separates Morse characters
- ⏱️ **Longer pause** → creates a space
- 👁️👁️👁️ **Three rapid blinks** → submits the search

The decoded characters appear directly in the search bar.

But Guloogulu doesn't stop there.

After a search is submitted, there is a random chance that the system will pretend to malfunction for exactly **15 seconds**, during which the user's painstakingly entered query gets randomly scrambled.

Users can also blink the word **CLOSE** in Morse code to exit Guloogulu. An incorrect attempt at the CLOSE command can activate a completely unnecessary **15-minute punishment mode**, where clicking and typing are disabled.

---

# Technical Details

## Technologies / Components Used

### For Software

**Languages:**
- HTML
- CSS
- JavaScript

**Libraries / APIs:**
- MediaPipe Face Landmarker
- MediaPipe Tasks Vision
- WebRTC / `getUserMedia()`
- Browser DOM APIs

**Computer Vision:**
- Real-time webcam processing
- Facial landmark detection
- Eye landmark tracking
- Eye Aspect Ratio (EAR)
- Blink duration measurement
- Short/long blink classification

**Tools:**
- Visual Studio Code
- Git
- GitHub
- Web Browser
- Webcam

### For Hardware

No additional hardware is required.

The project uses the **built-in laptop/desktop webcam** for eye tracking.

---

# Implementation

## For Software

### Installation

Clone the repository:

```bash
git clone https://github.com/Aswathykarun/useless_project_temp.git
cd useless_project_temp
