import openai
import os
import base64
from tenacity import retry, stop_after_attempt


@retry(stop=stop_after_attempt(4))
def get_vlm_score_once(screenshot_fpath: str, task: str) -> float:
    """
    Prompts GPT-4.1 to evaluate if the screenshot evidences that the player fulfilled the task.
    The model is asked to think step-by-step about what it sees in the screenshot and how it
    relates to the task, then provide a final answer constrained to one of:
    - "agree"
    - "somewhat agree"
    - "neutral"
    - "somewhat disagree"
    - "disagree"
    The response is mapped to a Likert scale score:
    - disagree: 0.0
    - somewhat disagree: 0.25
    - neutral: 0.5
    - somewhat agree: 0.75
    - agree: 1.0
    """
    # Read and encode the screenshot to base64
    with open(screenshot_fpath, "rb") as image_file:
        encoded_image = base64.b64encode(image_file.read()).decode("utf-8")

    # Set up the OpenAI client
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key is None:
        raise ValueError("OPENAI_API_KEY environment variable not set.")
    client = openai.OpenAI(api_key=api_key)

    # Define the prompt
    prompt = (
        f"Evaluate whether the provided screenshot evidences that the player fulfilled the task: '{task}'. "
        "Think step-by-step, considering the following: "
        "1. Describe the key elements visible in the screenshot. "
        "2. Explain how these elements relate to the task. "
        "3. Assess whether these elements provide clear evidence that the task was fulfilled. "
        "After your step-by-step reasoning, provide your final answer as a single word or phrase, "
        "indicating your your level of agreement with the statement: "
        f"'The screenshot evidences that the player fulfilled the task: {task}.'"
        "The final word you output must exactly one of the following options: "
        "agree, somewhat agree, neutral, somewhat disagree, disagree."
    )

    # Make the API call
    response = client.chat.completions.create(
        model="gpt-4.1-2025-04-14",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{encoded_image}"},
                    },
                ],
            }
        ],
        max_tokens=500,
    )

    print("ScreenshotSteve GPT-4.1 response:")
    print("=" * 50)
    print(response.choices[0].message.content.strip())
    print("=" * 50)

    # Extract the final answer
    final_answer = response.choices[0].message.content.strip().split()[-1].lower()

    # Validate the response
    valid_responses = ["agree", "somewhat agree", "neutral", "somewhat disagree", "disagree"]
    if final_answer not in valid_responses:
        raise ValueError(
            f"Invalid response '{final_answer}'. Must be one of: {', '.join(valid_responses)}"
        )

    # Map the response to a score
    score_mapping = {
        "disagree": 0.0,
        "somewhat disagree": 0.25,
        "neutral": 0.5,
        "somewhat agree": 0.75,
        "agree": 1.0,
    }

    return score_mapping[final_answer]
