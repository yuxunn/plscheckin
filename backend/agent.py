import os
import yaml
import joblib
import logging
from google import genai
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - 🤖 GenAI Agent: %(message)s')
logger = logging.getLogger()

class PlsCheckinAgent:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.client = None

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in .env file. Please add it.")

        try:
            self.client = genai.Client(api_key=self.api_key)
        except Exception as e:
            raise RuntimeError(f"Failed to connect to Google GenAI: {e}")

    def interpret_model_results(self, feature_names):
        """
        Generates a summary using the feature names provided by main.py.
        """
        if not self.client:
            return "Error: AI Client not active."

        try:
            if hasattr(feature_names, 'tolist'):
                feature_names = feature_names.tolist()

            features_str = ", ".join(feature_names) if feature_names else "Unknown features"
            
            prompt = (
                f"You are a Hotel Business Consultant. The predictive model relies on these features: "
                f"[{features_str}]. "
                f"Briefly explain to a hotel manager how these specific factors typically influence cancellation rates "
                f"and suggest one strategy to reduce no-shows based on them."
            )

            response = self.client.models.generate_content(
                model="gemini-2.5-flash", 
                contents=prompt
            )
            
            return response.text
            
        except Exception as e:
            logger.error(f"GenAI Prediction Error: {e}")
            return f"AI Analysis Failed: {str(e)}"

    def suggest_next_steps(self, df):
        """
        Autonomously suggests feature engineering steps based on data distributions.
        """
        try:
            cols = df.columns.tolist()
            prompt = (
                f"As a Data Science Agent, analyze these dataset columns: {cols}. "
                f"Suggest 2 creative feature engineering steps to improve a no-show model."
            )
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return f"\n--- Agentic Engineering Suggestions ---\n{response.text}"
        except Exception as e:
            return f"Agentic Suggestion Error: {e}"