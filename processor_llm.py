# From dotenv file: Import all the environment variables:
from wsgiref import types
from dotenv import load_dotenv
import os

# Importing the Google GenAI library to use the Gemini LLM:
from google import genai
from google.genai import types

# Loading all the environment variables:
load_dotenv() 

# Check if GEMINI_API_KEY is set
if not os.getenv("GEMINI_API_KEY"):
    raise ValueError("GEMINI_API_KEY environment variable is not set. Please add it to your .env file.")

# Creating a groq client:
client = genai.Client()

# Defining a function to classify the log message using Gemini LLM:
def classify_with_LLM(log_message):
    """
    Classifies the log message using Gemini LLM.
    """
    
    # Defining the prompt to classify the log message:
    prompt = f"""
    Classify the following log message:
    Log Message: "{log_message}"
    into exactly one of these categories:
    - Workflow Error
    - Deprecation Warning
    - Unclassified - If the log message does not fit into any of the above categories, classify it as "Unclassified".
    Give one word answer in Title Case without any preamble, explanation, or punctuation. Only category name must be returned.
    """

    # Calling the Gemini LLM to classify the log message:
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents = prompt,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_budget=0) # Disables thinking
        ),  
    )

    # Returning the classification result:
    return response.text

if __name__ == "__main__":
    classify_with_LLM("Failed to connect to the database.")
    classify_with_LLM("Deprecated API endpoint used in the request.")