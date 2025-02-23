import { useState, useEffect } from "react";
import io from "socket.io-client";

import { GamePhase } from "./types";

import SceneDisplay from "./SceneDisplay";

// host backend socket
const socket = io("http://localhost:5000");

type TranscriptEntry = {
    role: string;
    text: string;
    round: number;
};

export default function App() {
    const [phase, setPhase] = useState<GamePhase>(GamePhase.MAIN_MENU);
    const [joinCode, setJoinCode] = useState("");
    const [players, setPlayers] = useState([]);
    const [scenario, setScenario] = useState("");
    const [turnOrder, setTurnOrder] = useState<string[]>([]);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    //const [currentRound, setCurrentRound] = useState(0);
    const [llmThoughts, setLlmThoughts] = useState("");
    const [finalVerdict, setFinalVerdict] = useState("");
    const [activeRole, setActiveRole] = useState("");

    useEffect(() => {
        socket.emit("createSession");
        setPhase(GamePhase.MAIN_MENU);

        socket.on("sessionCreated", (data) => {
            setJoinCode(data.joinCode);
        });

        socket.on("playerJoined", (data) => {
            setPlayers(data);
        });

        socket.on("gameStarted", (data) => {
            setScenario(data.scenario);
            setPlayers(data.players);
            setTurnOrder(data.turnOrder);
        });

        socket.on("turnUpdate", (data) => {
            setActiveRole(data.activeRole);
            setTranscript(data.transcript);
            //setCurrentRound(data.round);
        });

        socket.on("roundUpdate", (data) => {
            //setCurrentRound(data.round);
            setLlmThoughts(data.llmThoughts);
            setTranscript(data.transcript);
        });

        socket.on("finalVerdict", (data) => {
            setFinalVerdict(data.verdict);
            setTranscript(data.transcript);
        });

        return () => {
            socket.off();
        };
    }, []);

    function render_ui(state: GamePhase) {
        switch (state) {
            case GamePhase.MAIN_MENU:
                return <h1 className="text-7xl">Circuit Court</h1>;
        }
    }

    return (
        <>
            <SceneDisplay
                className="w-screen h-screen -z-10 absolute"
                phase={phase}
            />
            {render_ui(phase)}
            <div className="p-5">
                <h1>Courtroom Showdown – Host</h1>
                <section>
                    <h2>Session Details</h2>
                    <p>
                        <strong>Join Code (Session ID):</strong> {joinCode}
                    </p>
                </section>

                <section>
                    <h2>Players</h2>
                    <ul>
                        {players.map((role, idx) => (
                            <li key={idx}>{role}</li>
                        ))}
                    </ul>
                </section>

                {scenario && (
                    <section>
                        <h2>Case Scenario</h2>
                        <p>{scenario}</p>
                    </section>
                )}

                {turnOrder.length > 0 && (
                    <section>
                        <h2>Turn Order</h2>
                        <ol>
                            {turnOrder.map((role, idx) => (
                                <li key={idx}>{role}</li>
                            ))}
                        </ol>
                    </section>
                )}

                <section>
                    <h2>Transcript</h2>
                    {transcript.length === 0 ? (
                        <p>No submissions yet.</p>
                    ) : (
                        <ul>
                            {transcript.map((entry, idx) => (
                                <li key={idx}>
                                    <strong>
                                        Round {entry.round} – {entry.role}:
                                    </strong>{" "}
                                    {entry.text}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {llmThoughts && (
                    <section>
                        <h2>LLM Interim Opinion</h2>
                        <p>{llmThoughts}</p>
                    </section>
                )}

                {finalVerdict && (
                    <section>
                        <h2>Final Verdict</h2>
                        <p>{finalVerdict}</p>
                    </section>
                )}

                <section>
                    <h2>Current Turn</h2>
                    <p>
                        <strong>Active Role:</strong> {activeRole}
                    </p>
                </section>
            </div>
        </>
    );
}
