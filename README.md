![Circuit Court](https://github.com/jaxsonp/circuit-court/blob/main/media/logo.png?raw=true)

Battle as Prosecutor or Defense in AI-generated legal cases! Present arguments across 3 rounds, adapt to the AI judge’s live feedback, and sway its verdict.

[Demo playthrough](https://youtu.be/kkUrga_H6jI)

_Made by Brian Gan, Nick Andry, and Jaxson Pahukula in 36 hours for Boilermake XII_

## Inspiration  
We enjoy party games like Jackbox and the drama of courtroom shows, and wanted to join the two in our project. Brainstorming led to Circuit Court, a fun game that harnesses generative AI to act as a dynamic “judge,” where players argue not just against each other, but against an LLM’s logic.  

## What It Does  
Players join from their mobile devices as Prosecutor or Defense in AI-generated legal battles. Over three rounds, they present arguments to sway the AI judge, which reacts with live feedback before delivering a verdict.

## How We Built It  
- Frontend: Host screen built with React and Babylon.js for real-time visuals, 3d graphics, and animations.  
- Backend: A Python Flask server handles game logic and player connections.  
- AI Core: A self-hosted Llama model generates scenarios, evaluates arguments, and writes feedback.  
- Multiplayer: WebSockets sync inputs and game state between the server, host, and players.  

## Challenges We Ran Into  
- Protocol design: Syncing game state between the server, host, and players was surprisingly tricky to design efficiently.
- React Rendering: Mixing rendering logic with dynamic game state in React was difficult to get working.
- Hosting: Hosting the LLM on Modal and the server on Google Cloud introduced complexity in managing cross-platform communication.  

## Accomplishments We’re Proud Of  
- Dynamic Scenarios: No two cases are alike. The AI crafts everything from stolen cupcakes to robot rebellions, keeping gameplay fresh and unpredictable.  
- Interesting Graphics: Using a 3D scene for the visuals was very challenging in the relatively short time constraints, so we were proud to produce graphics we are happy with.

## What We Learned  
- Networking is Hard: Syncing multiple clients in real-time requires mindfulness of various errors
- React Best Practices: Separating rendering logic from game state management is crucial for performance and maintainability.  
- Using Modal and Google Cloud required us to keep things consistent across multiple platforms.

## What’s Next for Circuit Court  
- Additional roles: Spectators can join as jurors and give their input.  
- Objections: Players can interrupt and object to their opponent's arguments
- Custom Scenarios: Let players input their own conflicts (e.g., “Roommate ate my pizza”).  
- Mobile App: Scan a QR to jump into the courtroom!  

## Gallery

Main Menu

![Menu](https://github.com/jaxsonp/circuit-court/blob/main/media/circuit-court-1.png?raw=true)

Example scenario

![Example scenario](https://github.com/jaxsonp/circuit-court/blob/main/media/circuit-court-2.png?raw=true)

Defense lawyer making his case

![Prosecution](https://github.com/jaxsonp/circuit-court/blob/main/media/circuit-court-4.png?raw=true)

![Defense](https://github.com/jaxsonp/circuit-court/blob/main/media/circuit-court-4.png?raw=true)

View from the player's mobile device

![Mobile view](https://github.com/jaxsonp/circuit-court/blob/main/media/phone-1.png?raw=true)


## Credits

 - Person Mesh derived from: "Free Pack - Chibi Base Mesh (Rigged)" (https://skfb.ly/p8Gxz) by PolyOne Studio is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
 - Music:
   - [Law & Order - Theme](https://www.youtube.com/watch?v=xz4-aEGvqQM)
   - [Pheonix Wright Ace Attorney - Pressing Pursuit](https://www.youtube.com/watch?v=UxnvGDK0WGM)
