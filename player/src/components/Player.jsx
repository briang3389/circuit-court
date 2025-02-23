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
    <div className="container mt-4">
      <h1 className="mb-4">Circuit Court – Player</h1>
      {!joined ? (
        <div className="card p-4">
          <h2 className="card-title mb-3">Join Game</h2>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Enter Join Code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              className="form-control"
            />
          </div>
          <button onClick={handleJoin} className="btn btn-primary">
            Join Game
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <h2>Welcome, {role}</h2>
            <p className="lead">
              It is currently{" "}
              <strong>{isMyTurn ? "your" : activeRole + "'s"} turn.</strong>
            </p>
          </div>

          <div className="card mb-4">
            <div className="card-header">Submit Evidence/Argument</div>
            <div className="card-body">
              <textarea
                rows="3"
                placeholder="Enter your evidence or argument..."
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                className="form-control mb-3"
              />
              <button
                onClick={handleSubmitEvidence}
                disabled={!isMyTurn}
                className="btn btn-success"
              >
                Submit
              </button>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header">Transcript</div>
            <ul className="list-group list-group-flush">
              {transcript.length === 0 ? (
                <li className="list-group-item">No submissions yet.</li>
              ) : (
                transcript.map((entry, idx) => (
                  <li key={idx} className="list-group-item">
                    <strong>
                      Round {entry.round} – {entry.role}:
                    </strong>{" "}
                    {entry.text}
                  </li>
                ))
              )}
            </ul>
          </div>

          {finalVerdict && (
            <div className="card mb-4">
              <div className="card-header">Final Verdict</div>
              <div className="card-body">
                <p className="card-text">{finalVerdict}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Player;
