/// <reference types="vite/types/importMeta.d.ts" />
import React, {useEffect, useState} from 'react'

type Message = {
    role: "system" | "user" | "assistant";
    content: string;
  };

enum State {
    PROSECUTOR_ARG,
    DEFENDANT_ARG,
}

const SubmissionComponent = () => {
    const MODEL_NAME = "neuralmagic/Meta-Llama-3.1-8B-Instruct-quantized.w4a16"
    const [round, setRound] = useState(1);
    const [firstWaitingCallDone, setfirstWaitingCallDone] = useState(false);
    const [input, setInput] = useState("");
    const [response, setResponse] = useState("");
    const [loading, setLoading] = useState(false);
    const [courtCase, setCourtCase] = useState("");
    const [task, setTask] = useState("");
    const [waiting, setWaiting] = useState(false);
    const [state, setState] = useState(State.PROSECUTOR_ARG);
    const [messageHistory, setMessageHistory] = useState<Message[]>(
    [
        {
            role: "system",
            
            content: `You are an unbiased judge for a case that is brought before you.
                      You will be told the details of the case. 
                      There is the defendant who has a defense attorney, and there is a 
                      prosecutor who is suing the defendant for damages on behalf of their client.
                      In rounds, the prosecutor and the defense will give you reasoning and evidence
                      for their side of the case.
                      After each round, you will give your current opinion on the evidence that
                      has been brought before you and who you are favoring, as well as your reasoning.
                      At the end, you will give a final verdict on who has won the case, giving reasoning
                      for this verdict.
                      You will be told at each step what to reply with.
                      Keep it fun and lighthearted, not too serious.`            
        },
    ]);

    useEffect(() => {
        console.log("rungame")
        runGame();
    }, []);

    useEffect(() => {
        if (!firstWaitingCallDone) {
            setfirstWaitingCallDone(true)
            return;
        }

        processInput();
    }, [waiting]);

    const processInput = async () => {
        if (!waiting) {
            switch (state) {
                case State.PROSECUTOR_ARG: {
                    giveContext("Here is an argument from the prosecutor:")
                    giveContext(input)

                    setTask("Give argument for defendant")
                    setState(State.DEFENDANT_ARG);
                    waitForResponse();
                    break;
                }

                case State.DEFENDANT_ARG: {
                    giveContext("Here is an argument from the defendant:")
                    giveContext(input)

                    if (round == 3) {
                        giveContext("Now give a final verdict for the case. Make sure to state who has won:");
                        await queryModel(messageHistory);
                        setTask("The game is over")
                        return;
                    }

                    giveContext("Now give your current feelings about the case and your reasoning why:")
                    let feelings = await queryModel(messageHistory);

                    appendToHistory({role: "assistant", content: feelings});
                    setRound(round + 1);
                    setState(State.PROSECUTOR_ARG);
                    setTask("Give argument for prosecutor")
                    waitForResponse();
                    break;
                }
            }
        
        }

    }

    const runGame = async () => {
        let caseRes = await queryModel([{
            role: "user", 
            content: `Give me a brief scenario of an imaginary court case.
                    State concisely what damages the defendant has caused to
                    the prosecutor's party. 
                    Give the defendant and the party of the prosecutor names.
                    Make it something realistic but funny, ideally something one college student would do to another.
                    Make it very short.
                    Do not give a title to it
                    Just state the situation.`
        }]);
        setCourtCase(caseRes);

        giveContext("Here are the details of the case:")
        giveContext(caseRes);

        setTask("Give argument for prosecutor")
        waitForResponse();

    }
    
    const giveContext = (ctx: string) => {
        appendToHistory({role: "user", content: ctx});
    }

    const waitForResponse = () => {
        setWaiting(true);
    }

    const queryModel = async (history: Message[]) => {
        setLoading(true);
        setResponse("");

        let llmRes = "";
        try {
            const res = await fetch(`${import.meta.env.VITE_LLM_URL}/v1/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${import.meta.env.VITE_API_KEY}`,
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: history,
                }),
            });

            const data = await res.json();
            llmRes = data.choices?.[0]?.message?.content || "No response received";
            setResponse(llmRes);
        } catch (error) {
            console.error("Error fetching response:", error);
            setResponse("Error fetching response");
        }
        setLoading(false);
        return llmRes;
    }

    const appendToHistory = (msg: Message) => {
        let currHistory = messageHistory;
        currHistory.push(msg);
        setMessageHistory(currHistory);
    }

    const handleSubmit = async () => {
        if (!input.trim()) return;
        setWaiting(false);
    };

    return (
        <div style={{ maxWidth: "400px", margin: "auto", padding: "20px" }}>
            {courtCase && (
                <div style={{ padding: "10px", border: "1px solid #ccc", marginTop: "10px" }}>
                    <p>{courtCase}</p>
                </div>
            )}
            {task && (
                <div style={{ padding: "10px", border: "1px solid #ccc", marginTop: "10px" }}>
                    <p>{task}</p>
                </div>
            )}
            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask ChatGPT..."
                style={{ width: "100%", padding: "10px", marginBottom: "10px" }}
            />
            <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "10px" }}>
                {loading ? "Loading..." : "Submit"}
            </button>
            {response && (
                <div style={{ padding: "10px", border: "1px solid #ccc", marginTop: "10px" }}>
                    <p>{response}</p>
                </div>
            )}
            <hr></hr>
            <hr></hr>
            <hr></hr>
            {messageHistory.map((item, index) => (
                <div key={`${item.content}-${index}`} style={{ padding: "10px", border: "1px solid #ccc", marginTop: "10px" }}>
                    <p>{item.content}</p>
                </div>
            ))}
        </div>
    );
};

export default SubmissionComponent;
