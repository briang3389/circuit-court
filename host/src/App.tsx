import { useState, useEffect, useCallback, useRef } from "react";
import io from "socket.io-client";

import { GamePhase, Role, Speaker } from "./types";

import SceneDisplay from "./SceneDisplay";

// host backend socket
const socket = io(`http://${import.meta.env.VITE_HOST_URL}:5000`);

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
    const [gameOverText, setGameOverText] = useState("");

    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const transcriptAppend = useCallback((entry: TranscriptEntry) => {
        setTranscript((t) => [...t, entry]);
    }, []);

    const [phase, setPhase] = useState<GamePhase>(GamePhase.MAIN_MENU);
    const [speechText, setSpeechText] = useState<string | null>(null);

    const [musicAllowed, setMusicAllowed] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handlePlaying = () => {
            if (!musicAllowed) {
                setMusicAllowed(true);
            }
        };

        audio.addEventListener("playing", handlePlaying);

        return () => {
            audio.removeEventListener("playing", handlePlaying);
        };
    }, [musicAllowed]);

    useEffect(() => {
        if (audioRef.current && musicAllowed) {
            // Pause current playback.
            audioRef.current.pause();

            // Set source based on the gameStarted state.
            audioRef.current.src = gameStarted
                ? "/game_music.mp3"
                : "/lobby_music.mp3";

            // Reload the new source and play.
            audioRef.current.load();
            audioRef.current
                .play()
                .catch((err) => console.log("Playback prevented:", err));
        }
    }, [gameStarted, musicAllowed]);

    const handleMusicStart = () => {
        setMusicAllowed(true);
        // Attempt to play the current track immediately.
        if (audioRef.current) {
            audioRef.current
                .play()
                .catch((err) => console.log("Playback prevented:", err));
        }
    };

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

            if (data.winner == "Prosecutor") {
                setGameOverText("Verdict: Guilty\nProsecutor Wins");
            } else if (data.winner == "Defense") {
                setGameOverText("Verdict: Not Guilty\nDefense Wins");
            } else {
                setGameOverText("Verdict: Draw\nTest");
            }

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
            <audio ref={audioRef} loop />
            {!musicAllowed && (
                <div
                    onClick={handleMusicStart}
                    style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        cursor: "pointer",
                        zIndex: 1000,
                        backgroundColor: "rgba(255,255,255,0.7)",
                        padding: "5px",
                        borderRadius: "50%",
                    }}
                >
                    🔇
                </div>
            )}
            <SceneDisplay
                className="w-screen h-screen -z-10 absolute"
                phase={phase}
            />
            <div className="w-screen h-screen flex flex-col items-center">
                {!gameStarted ? (
                    <>
                        <h1 className="text-7xl font-big text-center m-10 bg-[#7CAFC4] w-full p-2 border-[#EBB010] border-y-8 shadow-lg">
                            Circuit Court
                        </h1>
                        <div className="h-[40%]"></div>
                        <p className="text-5xl bold py-4 px-8 m-8 bg-[#7CAFC4] rounded-2xl">
                            Join Code: {joinCode}
                        </p>

                        <p className="text-3xl py-4 px-8 bg-[#7CAFC4] rounded-2xl">
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
                        <div className="m-4 px-8 py-6 bg-white rounded-[70px]">
                            <p className="text-3xl leading-none">
                                {speechText}
                            </p>
                        </div>
                        <div className="grow"></div>
                        {transcript.length != 10 ? (
                            <div className="bg-[#7CAFC4] px-8 py-3 my-4 text-5xl rounded-2xl">
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
                        ) : (
                            <>
                                <div className="bg-[#7CAFC4] px-14 py-5 my-4 rounded-2xl">
                                    {gameOverText.split("\n").map((str) => (
                                        <p className="text-6xl">{str}</p>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        window.location.reload();
                                    }}
                                    className="bg-[#7CAFC4] p-4 my-4 rounded-2xl text-5xl border-8 border-[#EBB010] italic shadow-xl border-double hover:border-solid"
                                >
                                    Take another case
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
