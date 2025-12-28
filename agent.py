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
        """Initializes the Agent and Google Gen AI Client using config.yaml paths."""
        with open("config.yaml", "r") as f:
            self.config = yaml.safe_load(f)
        
        self.model_path = self.config['paths']['model_output']
        self.client = genai.Client()

    def interpret_model_results(self, feature_names):
        """
        Translates feature importance into a natural language summary for business leaders.
        """
        try:
            pipeline = joblib.load(self.model_path)
            model = pipeline.named_steps['classifier']
            
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
                feat_imp = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)[:3]
            else:
                return "Error: Model does not support feature importance extraction."

            prompt = (
                f"You are a Hotel Business Consultant. Translate these technical ML results into a "
                f"3-sentence summary for a Hotel Manager: {feat_imp}. "
                f"Identify the cause of no-shows and suggest one specific action."
            )

            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return f"\n--- Business Summary ---\n{response.text}"
        except Exception as e:
            return f"GenAI Interpretation Error: {e}"

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