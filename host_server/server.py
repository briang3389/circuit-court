# server.py

import eventlet

eventlet.monkey_patch()

import os
import time

from flask import Flask, request
from flask_socketio import SocketIO, join_room, emit
import random, string
from openai import OpenAI
from dotenv import load_dotenv

DELIBERATION_TIME = 5

load_dotenv()
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app, cors_allowed_origins="*")

client = OpenAI(api_key=os.environ.get("API_KEY"), base_url=os.environ.get("LLM_URL"))


def query_llm(history):
    while True:
        response = client.chat.completions.create(
            messages=history,
            model="neuralmagic/Meta-Llama-3.1-8B-Instruct-quantized.w4a16",
        )
        text = response.choices[0].message.content.replace("*", "").replace("_", "")
        if len(text.split()) < 300:
            break
    return text


def add_context(content, session, role="user"):
    session["history"].append({"role": role, "content": content})


# Sessions keyed by join code (which is also the session ID)
# Each session structure:
# {
#    'players': { "Prosecutor": {id, role}, "Defense": {id, role} },
#    'transcript': [ { 'role': str, 'text': str, 'round': int } ],
#    'history': [ {'role': str, 'context': str } ],
#    'scenario': str,
#    'turn_order': [ role, role ],
#    'player_map': { socket_id: role },
#    'round': int  (current round number, starts at 1)
#    'submissionCount': int (number of submissions so far)
# }
sessions = {}


def generate_join_code():
    return "".join(random.choices(string.digits, k=4))


def llm_get_winner(session):
    add_context(
        (
            "Based on your final verdict, who won the case? "
            "Respond only with 'Prosecutor', 'Defense', or 'Neither', without the quotes. "
            "Choose Neither if you think that neither of them deserve to win the case. "
            "Nothing else should be in your response. It should ONLY be one of those three words. "
            "No matter what, you MUST choose Prosecutor, Defense, or Neither, even if you think neither of them won."
        ),
        session,
    )
    winner = query_llm(session["history"]).strip()
    if winner not in ["Prosecutor", "Defense", "Neither"]:
        winner = random.choice(["Prosecutor", "Defense", "Neither"])
    return winner


def llm_scenario(session):
    scenario = query_llm(
        [
            {
                "role": "user",
                "content": (
                    "Give me a brief scenario of an imaginary court case. "
                    "State concisely what damages the defendant has caused to "
                    "the prosecutor's party. "
                    "Clearly state the names of the defendant and the plaintiff "
                    "Make it something realistic but funny, ideally something one college student would do to another. "
                    "Make it very short. "
                    "Do not give a title to it "
                    "Just state the situation between the two parties."
                    "Make this very short. I repeat, MAKE THIS VERY SHORT. Do not make this a long explanation, get to the point."
                ),
            }
        ]
    )
    add_context("Here are the details of the case:", session)
    add_context(scenario, session)
    return scenario


def llm_interim(session):
    add_context(
        "Now give your current feelings about the case and your reasoning why:", session
    )
    interim = query_llm(session["history"])
    add_context(interim, session, "assistant")
    return interim


def llm_verdict(session):
    add_context(
        "Now give a final verdict for the case. Make sure to state who has won:",
        session,
    )
    verdict = query_llm(session["history"])
    add_context(verdict, session, "assistant")
    return verdict


@app.route("/")
def index():
    return "Circuit Court Server is running."


@socketio.on("createSession")
def handle_create_session():
    join_code = generate_join_code()
    sessions[join_code] = {
        "players": {},  # keys: "Prosecutor" and "Defense"
        "transcript": [],
        "scenario": "",
        "turn_order": [],
        "player_map": {},
        "round": 1,  # start round numbering at 1
        "submissionCount": 0,  # count of submissions so far
    }
    sessions[join_code]["history"] = [
        {
            "role": "system",
            "content": (
                "You are an unbiased judge for a case that is brought before you. "
                "You will be told the details of the case. "
                "There is the defendant who has a defense attorney, and there is a "
                "prosecutor who is suing the defendant for damages on behalf of their client. "
                "In rounds, the prosecutor and the defense will give you reasoning and evidence "
                "for their side of the case. "
                "After each round, you will give your current opinion on the evidence that "
                "has been brought before you and who you are favoring, as well as your reasoning. "
                "At the end, you will give a final verdict on who has won the case, giving reasoning "
                "for this verdict. "
                "You will be told at each step what to reply with. "
                "Keep it fun and lighthearted, not too serious. "
                "Make every response very short."
            ),
        }
    ]
    join_room(join_code)
    emit("sessionCreated", {"joinCode": join_code})
    print(f"Session created with join code {join_code}")


@socketio.on("joinGame")
def handle_join_game(data):
    join_code = data.get("joinCode")
    if join_code not in sessions:
        emit("error", {"message": "Invalid join code."})
        return
    session = sessions[join_code]
    # Automatically assign roles in join order.
    if "Prosecutor" not in session["players"]:
        role = "Prosecutor"
    elif "Defense" not in session["players"]:
        role = "Defense"
    else:
        emit("error", {"message": "Game is already full."})
        return
    session["players"][role] = {"id": request.sid, "role": role}
    session["player_map"][request.sid] = role
    join_room(join_code)
    emit("roleAssigned", {"role": role})
    emit("playerJoined", list(session["players"].keys()), room=join_code)
    print(f"{role} joined session {join_code}")
    # Start game automatically once both players have joined.
    if len(session["players"]) == 2:
        start_game(join_code)


def start_game(join_code):
    session = sessions[join_code]
    scenario = llm_scenario(session)
    session["scenario"] = scenario
    # Determine turn order randomly (coin toss).
    roles = ["Prosecutor", "Defense"]
    if random.random() < 0.5:
        turn_order = roles
    else:
        turn_order = roles[::-1]
    session["turn_order"] = turn_order
    # Emit gameStarted event with scenario, player roles, and turn order.
    socketio.emit(
        "gameStarted",
        {
            "scenario": scenario,
            "players": list(session["players"].keys()),
            "turnOrder": turn_order,
        },
        room=join_code,
    )
    # Announce whose turn it is for round 1.
    active_role = session["turn_order"][
        session["submissionCount"] % 2
    ]  # submissionCount is 0 initially
    socketio.emit(
        "turnUpdate",
        {
            "activeRole": active_role,
            "transcript": session["transcript"],
            "round": session["round"],
        },
        room=join_code,
    )
    print(f"Game started for session {join_code}. Turn order: {turn_order}")


@socketio.on("submitEvidence")
def handle_submit_evidence(data):
    join_code = data.get("joinCode")
    evidence_text = data.get("evidenceText")
    if join_code not in sessions:
        emit("error", {"message": "Session not found"})
        return
    session = sessions[join_code]
    role = session["player_map"].get(request.sid)
    if not role:
        emit("error", {"message": "Player role not found"})
        return
    # Check that it is the submitting player's turn.
    expected_role = session["turn_order"][session["submissionCount"] % 2]
    if role != expected_role:
        emit("error", {"message": "Not your turn."})
        return
    current_round = session["round"]

    if role == "Defense":
        add_context("Here is an argument from the defense:", session)
    elif role == "Prosecutor":
        add_context("Here is an argument from the prosecutor:", session)
    add_context(evidence_text, session)

    # Create submission (both submissions in the same round carry the same round number).
    submission = {"role": role, "text": evidence_text, "round": current_round}
    session["transcript"].append(submission)
    session["submissionCount"] += 1
    print(
        f"Submission from {role} in session {join_code} (Round {current_round}): {evidence_text}"
    )

    NUM_ROUNDS_PER_GAME = 3

    # Check if the round is complete (i.e. both players have submitted).
    if session["submissionCount"] % 2 == 0:
        # Continue to next round if game is not over (limit to 2 rounds here).
        if current_round < NUM_ROUNDS_PER_GAME:
            session["round"] += 1
            next_active = session["turn_order"][0]
            socketio.emit(
                "turnUpdate",
                {
                    "activeRole": next_active,
                    "transcript": session["transcript"],
                    "round": session["round"],
                },
                room=join_code,
            )
            print(f"Next round {session['round']} starting, active role: {next_active}")
        else:
            conclude_game(join_code)

        # End of round: compute interim opinion.
        if current_round != NUM_ROUNDS_PER_GAME:
            time.sleep(DELIBERATION_TIME)
            interim_opinion = llm_interim(session)
            socketio.emit(
                "roundUpdate",
                {
                    "transcript": session["transcript"],
                    "round": current_round,
                    "llmThoughts": interim_opinion,
                },
                room=join_code,
            )
    else:
        # If the round is not yet complete, update the active turn.
        next_active = session["turn_order"][session["submissionCount"] % 2]
        socketio.emit(
            "turnUpdate",
            {
                "activeRole": next_active,
                "transcript": session["transcript"],
                "round": current_round,
            },
            room=join_code,
        )
        print(f"Next turn in round {current_round}: {next_active}")


def conclude_game(join_code):
    session = sessions.get(join_code)
    next_active = session["turn_order"][session["submissionCount"] % 2]
    socketio.emit(
        "turnUpdate",
        {
            "activeRole": next_active,
            "transcript": session["transcript"],
            "round": 3,
        },
        room=join_code,
    )
    time.sleep(DELIBERATION_TIME)
    final_verdict = llm_verdict(session)
    winner = llm_get_winner(session)
    socketio.emit(
        "finalVerdict",
        {
            "verdict": final_verdict,
            "transcript": session["transcript"],
            "winner": winner,
        },
        room=join_code,
    )
    print(f"Game concluded for session {join_code}. Final verdict: {final_verdict}")


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
