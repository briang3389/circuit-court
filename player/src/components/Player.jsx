// Player.jsx
import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function Player() {
    const [joined, setJoined] = useState(false);
    const [joinCode, setJoinCode] = useState("");
    const [role, setRole] = useState("");
    const [activeRole, setActiveRole] = useState("");
    const [evidenceText, setEvidenceText] = useState("");
    const [transcript, setTranscript] = useState([]);
    const [currentRound, setCurrentRound] = useState(0);
    const [finalVerdict, setFinalVerdict] = useState("");

    useEffect(() => {
        socket.on("roleAssigned", (data) => {
            setRole(data.role);
        });

        socket.on("turnUpdate", (data) => {
            setActiveRole(data.activeRole);
            setTranscript(data.transcript);
            setCurrentRound(data.round);
        });

        socket.on("roundUpdate", (data) => {
            setCurrentRound(data.round);
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

    const handleJoin = () => {
        if (joinCode) {
            socket.emit("joinGame", { joinCode });
            setJoined(true);
        }
    };

    const handleSubmitEvidence = () => {
        if (evidenceText.trim() !== "") {
            socket.emit("submitEvidence", { joinCode, evidenceText });
            setEvidenceText("");
        }
    };

    // Determine if it's this player's turn.
    const isMyTurn = role === activeRole;

    return (
        <div style={{ padding: "20px" }}>
            <h1>Circuit Court – Player</h1>
            {!joined ? (
                <div>
                    <h2>Join Game</h2>
                    <input
                        type="text"
                        placeholder="Enter Join Code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                    />
                    <br />
                    <button onClick={handleJoin}>Join Game</button>
                </div>
            ) : (
                <div>
                    <h2>Welcome, {role}</h2>
                    <p>
                        <strong>
                            It is currently{" "}
                            {isMyTurn ? "your" : activeRole + "'s"} turn.
                        </strong>
                    </p>
                    <section>
                        <h3>Submit Evidence/Argument</h3>
                        <textarea
                            rows="4"
                            cols="50"
                            placeholder="Enter your evidence or argument..."
                            value={evidenceText}
                            onChange={(e) => setEvidenceText(e.target.value)}
                        />
                        <br />
                        <button
                            onClick={handleSubmitEvidence}
                            disabled={!isMyTurn}
                        >
                            Submit
                        </button>
                    </section>
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
                    {finalVerdict && (
                        <section>
                            <h2>Final Verdict</h2>
                            <p>{finalVerdict}</p>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}

export default Player;
