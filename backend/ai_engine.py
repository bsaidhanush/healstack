import os
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

# Rule-based fallback heuristic
def analyze_error_fallback(log_data: dict) -> dict:
    message = str(log_data).lower()

    if "network" in message:
        return {
            "severity": "Medium",
            "cause": "Network connectivity issue",
            "solution": "Retry API request or check internet connection"
        }
    elif "timeout" in message:
        return {
            "severity": "High",
            "cause": "Server response timeout",
            "solution": "Scale backend or optimize API response time"
        }
    elif "not defined" in message:
        return {
            "severity": "Low",
            "cause": "Undefined JavaScript function or missing variable reference",
            "solution": "Verify frontend imports and variable initialization"
        }
    else:
        return {
            "severity": "Unknown",
            "cause": "Unrecognized issue",
            "solution": "Manual inspection required"
        }

def analyze_error(log_data: dict) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")

    # Gracefully fall back to rule-based analysis if OpenAI API key is missing
    if not api_key:
        print("HealStack Warning: OPENAI_API_KEY is not configured. Using rule-based fallback AI engine.")
        return analyze_error_fallback(log_data)

    try:
        # Initialize OpenAI Client
        client = OpenAI(api_key=api_key)

        system_prompt = (
            "You are HealStack AI, an expert mobile and web infrastructure diagnostics engine. "
            "Analyze the provided application crash/error log payload and diagnose the issue. "
            "You MUST return your answer as a JSON object with exactly the following three keys:\n"
            '1. "severity": Choose from "Low", "Medium", "High".\n'
            '2. "cause": A brief, professional explanation of the root cause.\n'
            '3. "solution": A concrete, developer-friendly code solution or fix.\n\n'
            "Return ONLY the JSON string. Do not include markdown formatting or extra text."
        )

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Error Payload:\n{json.dumps(log_data, indent=2)}"}
            ],
            temperature=0.2,
            max_tokens=250,
            response_format={"type": "json_object"}
        )

        result_text = response.choices[0].message.content
        analysis = json.loads(result_text)

        # Confirm structure
        if "severity" in analysis and "cause" in analysis and "solution" in analysis:
            return analysis
        
        # In case structure is missing
        return analyze_error_fallback(log_data)

    except Exception as e:
        print(f"HealStack OpenAI Diagnosis Exception: {str(e)}. Falling back to rule-based analysis.")
        return analyze_error_fallback(log_data)
