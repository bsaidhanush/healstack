def analyze_error(log):

    message = str(log).lower()

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
            "cause": "Undefined JavaScript function",
            "solution": "Check frontend function imports"
        }

    else:
        return {
            "severity": "Unknown",
            "cause": "Unrecognized issue",
            "solution": "Manual inspection required"
        }
