import { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";

import { GamePhase, Role, Speaker } from "./types";

import SceneDisplay from "./SceneDisplay";

// host backend socket
const socket = io("http://localhost:5000");

type TranscriptEntry = {
    role: string;
    text: string;
};

type Message = {
    text: string;
    speaker: Speaker;
};

export default function App() {
    const [phase, setPhase] = useState<GamePhase>(GamePhase.MAIN_MENU);
    const [joinCode, setJoinCode] = useState<string>("");
    const [players, setPlayers] = useState([]);
    const [turnOrder, setTurnOrder] = useState<string[]>([]);
    const [activeRole, setActiveRole] = useState<Role>(null);

    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const transcriptAppend = useCallback((entry: TranscriptEntry) => {
        setTranscript((t) => [...t, entry]);
    }, []);

    const [speechText, setSpeechText] = useState<string | null>(null);

    useEffect(() => {
        socket.emit("createSession");

        socket.on("sessionCreated", (data) => {
            setJoinCode(data.joinCode);
        });

        socket.on("playerJoined", (data) => {
            setPlayers(data);
        });

        socket.on("gameStarted", (data) => {
            console.log("Game started", data);
            setPlayers(data.players);
            setTurnOrder(data.turnOrder);

            transcriptAppend({ role: "Judge", text: data.scenario });
        });

        socket.on("turnUpdate", (data) => {
            console.log("Turn update", data);

            if (data.transcript.length > 0) {
                const text = data.transcript[data.transcript.length - 1].text;
                if (data.activeRole == "Prosecutor") {
                    transcriptAppend({ role: "Defense", text: text });
                } else if (data.activeRole == "Defense") {
                    transcriptAppend({ role: "Prosecutor", text: text });
                } else {
                    console.error("Erm", data);
                }
            }
            /*if (activeRole == "Defense") {
                queueMessage(msg, "Defense");
            } else if (activeRole == "Prosecutor") {
                queueMessage(msg, "Prosecutor");
            }*/

            setActiveRole(data.activeRole);
            //setCurrentRound(data.round);
        });

        socket.on("roundUpdate", (data) => {
            console.log("Round update", data.transcript);
            //setCurrentRound(data.round);

            transcriptAppend({ role: "Judge", text: data.llmThoughts });

            //queueMessage(data.llmThoughts, "Judge");
        });

        socket.on("finalVerdict", (data) => {
            console.log("Final verdict!", data);

            const text = data.transcript[data.transcript.length - 1].text;
            const role = data.transcript[data.transcript.length - 1].role;
            transcriptAppend({ role: role, text: text });

            transcriptAppend({ role: "Judge", text: data.verdict });
        });

        return () => {
            socket.off();
        };
    }, [transcriptAppend]);

    useEffect(() => {
        console.log("Transcript updated:", transcript);
    }, [transcript]);

    return (
        <>
            <SceneDisplay
                className="w-screen h-screen -z-10 absolute"
                phase={phase}
            />
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

                <section>
                    <h2>Transcript</h2>
                    {transcript.length === 0 ? (
                        <p>No submissions yet.</p>
                    ) : (
                        <ul>
                            {transcript.map((entry, idx) => (
                                <li key={idx}>
                                    <strong>Round N - {entry.role}:</strong>{" "}
                                    {entry.text}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

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
