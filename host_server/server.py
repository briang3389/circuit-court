# server.py

import eventlet

eventlet.monkey_patch()

from flask import Flask, request
from flask_socketio import SocketIO, join_room, emit
import random, string
# from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app, cors_allowed_origins="*")

# client = OpenAI(api_key=os.environ.get("API_KEY"), base_url=os.environ.get("LLM_URL"))

# chat_completion = client.chat.completions.create(
#     messages=[
#         {
#             "role": "user",
#             "content": "Say this is a test",
#         }
#     ],
#     model="neuralmagic/Meta-Llama-3.1-8B-Instruct-quantized.w4a16",
# )

# print(dir(chat_completion))


# Sessions keyed by join code (which is also the session ID)
# Each session structure:
# {
#    'players': { "Prosecutor": {id, role}, "Defense": {id, role} },
#    'transcript': [ { 'role': str, 'text': str, 'round': int } ],
#    'scenario': str,
#    'turn_order': [ role, role ],
#    'player_map': { socket_id: role },
#    'round': int  (current round number, starts at 1)
#    'submissionCount': int (number of submissions so far)
# }
sessions = {}


def query_llm(history):
	pass


def generate_join_code():
	return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


# --- Dummy LLM Simulation Functions ---
def llm_scenario():
	scenario = (
		"A leading tech company is accused of illegally collecting customer data. "
		"The prosecutor’s group alleges that the defendant misused personal information."
	)
	return scenario


def simulate_llm_interim(transcript, round_number):
	# Combine all submissions from the transcript into a summary.
	return f"POST ROUND {round_number} INTERIM OPINION HERE"
	combined = " | ".join([f"{entry['role']}: {entry['text']}" for entry in transcript])
	interim = f"After {round_number} round(s), the evidence shows: {combined[:100]}..."
	return interim


def simulate_llm_verdict(transcript):
	verdict = (
		"After reviewing all submissions, the final verdict favors the Defense. "
		"The prosecution’s submissions did not provide enough conclusive evidence."
	)
	return verdict


# --- End Dummy LLM Functions ---


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
	scenario = llm_scenario()
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
	# Create submission (both submissions in the same round carry the same round number).
	submission = {"role": role, "text": evidence_text, "round": current_round}
	session["transcript"].append(submission)
	session["submissionCount"] += 1
	print(
		f"Submission from {role} in session {join_code} (Round {current_round}): {evidence_text}"
	)

	NUM_ROUNDS_PER_GAME = 2

	# Check if the round is complete (i.e. both players have submitted).
	if session["submissionCount"] % 2 == 0:
		# End of round: compute interim opinion.
		interim_opinion = simulate_llm_interim(session["transcript"], current_round)
		socketio.emit(
			"roundUpdate",
			{
				"transcript": session["transcript"],
				"round": current_round,
				"llmThoughts": interim_opinion,
			},
			room=join_code,
		)
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
	final_verdict = simulate_llm_verdict(session["transcript"])
	socketio.emit(
		"finalVerdict",
		{"verdict": final_verdict, "transcript": session["transcript"]},
		room=join_code,
	)
	print(f"Game concluded for session {join_code}. Final verdict: {final_verdict}")


if __name__ == "__main__":
	socketio.run(app, host="0.0.0.0", port=5000, debug=False)
