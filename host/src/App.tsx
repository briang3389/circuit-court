import { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";

import { GamePhase, Role, Speaker } from "./types";

import SceneDisplay from "./SceneDisplay";

// host backend socket
const socket = io("http://localhost:5000");

type TranscriptEntry = {
    role: Speaker;
    text: string;
};

export default function App() {
    const [gameStarted, setGameStarted] = useState(false);
    const [roundNumber, setRoundNumber] = useState(0);
    const [joinCode, setJoinCode] = useState<string>("");
    const [players, setPlayers] = useState<Role[]>([]);
    const [turnOrder, setTurnOrder] = useState<string[]>([]);
    const [activeRole, setActiveRole] = useState<Role>(null);

    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const transcriptAppend = useCallback((entry: TranscriptEntry) => {
        setTranscript((t) => [...t, entry]);
    }, []);

    const [phase, setPhase] = useState<GamePhase>(GamePhase.MAIN_MENU);
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
            setGameStarted(true);
            setPlayers(data.players);
            setTurnOrder(data.turnOrder);

            transcriptAppend({
                role: "Judge",
                text: data.scenario,
            });
        });

        socket.on("turnUpdate", (data) => {
            console.log("Turn update", data);

            if (data.transcript.length > 0) {
                const text = data.transcript[data.transcript.length - 1].text;
                //const role = data.transcript[data.transcript.length - 1].role;

                if (data.activeRole == "Prosecutor") {
                    transcriptAppend({
                        role: "Defense",
                        text: text,
                    });
                } else if (data.activeRole == "Defense") {
                    transcriptAppend({
                        role: "Prosecutor",
                        text: text,
                    });
                } else {
                    // last
                    transcriptAppend({
                        role: "Judge",
                        text: text,
                    });
                }
            }
            /*if (activeRole == "Defense") {
                queueMessage(msg, "Defense");
            } else if (activeRole == "Prosecutor") {
                queueMessage(msg, "Prosecutor");
            }*/

            setActiveRole(data.activeRole);
            setRoundNumber(data.round);
        });

        socket.on("roundUpdate", (data) => {
            console.log("Round update", data.transcript);
            //setCurrentRound(data.round);

            transcriptAppend({
                role: "Judge",
                text: data.llmThoughts,
            });

            //queueMessage(data.llmThoughts, "Judge");
        });

        socket.on("finalVerdict", (data) => {
            console.log("Final verdict!", data);

            transcriptAppend({
                role: "Judge",
                text: data.verdict,
            });
        });

        return () => {
            socket.off();
        };
    }, [transcriptAppend]);

    useEffect(() => {
        console.log("Transcript updated:", transcript);
        if (transcript.length > 0) {
            const entry = transcript[transcript.length - 1];
            setSpeechText(entry.text);
            if (entry.role == "Judge") {
                setPhase(GamePhase.JUDGE_TALKING);
            } else if (entry.role == "Prosecutor") {
                setPhase(GamePhase.PROSECUTOR_TALKING);
            } else if (entry.role == "Defense") {
                setPhase(GamePhase.DEFENSE_TALKING);
            }
        }
    }, [transcript]);

    return (
        <>
            <SceneDisplay
                className="w-screen h-screen -z-10 absolute"
                phase={phase}
            />
            <div className="w-screen h-screen flex flex-col items-center">
                {!gameStarted ? (
                    <>
                        <h1 className="text-7xl font-big text-center m-10 bg-blue-400 w-full p-2 border-amber-300 border-y-8">
                            Circuit Court
                        </h1>
                        <div className="h-[40%]"></div>
                        <p className="text-5xl bold py-4 px-8 m-8 bg-blue-400 rounded-2xl">
                            Join Code: {joinCode}
                        </p>

                        <p className="text-3xl py-4 px-8 bg-blue-400 rounded-2xl">
                            Prosecutor:{" "}
                            {players.includes("Prosecutor") ? (
                                <span className="text-green-700">Joined!</span>
                            ) : (
                                <span>Not joined</span>
                            )}
                            <br />
                            Defense:{" "}
                            {players.includes("Defense") ? (
                                <span className="text-green-700">Joined!</span>
                            ) : (
                                <span>Not joined</span>
                            )}
                        </p>
                    </>
                ) : (
                    <>
                        <div className="w-max text-4xl h-[25%] m-8 p-8 bg-white rounded-[70px]">
                            {speechText}
                        </div>
                        <div className="grow"></div>
                        <div className="bg-blue-300 px-8 py-3 my-3 text-3xl rounded-2xl">
                            Round {roundNumber} -{" "}
                            {transcript.length % 3 == 0 &&
                            transcript.length != 0 ? (
                                <span>Judge Jason is deliberating...</span>
                            ) : (
                                <span>
                                    Make your argument,{" "}
                                    {activeRole?.toLowerCase()}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>
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
