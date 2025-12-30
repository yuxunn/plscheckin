import os
import sys
import pandas as pd
import joblib
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("API")

if os.path.abspath(".") not in sys.path:
    sys.path.append(os.path.abspath("."))

try:
    from src.preprocessing import clean_data, engineer_features
except ImportError:
    logger.critical("CRITICAL: Could not import 'preprocessing'. Check your src folder.")
    sys.exit(1)
agent = None
agent_init_error = None  

try:
    from agent import PlsCheckinAgent
    try:
        agent = PlsCheckinAgent()
        logger.info("GenAI Agent initialized successfully.")
    except Exception as e:
        agent_init_error = f"Initialization failed: {str(e)}"
        logger.warning(f"Agent found but failed to initialize: {e}")
except ImportError as e:
    agent_init_error = f"Import failed: {str(e)}"
    logger.warning(f"Agent import failed ({e}). /api/analysis will be unavailable.")

model = None
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
possible_paths = [
    os.path.join(BASE_DIR, "model.pkl"),       
    os.path.join(BASE_DIR, "..", "model.pkl"), 
    "model.pkl"
]

for path in possible_paths:
    if os.path.exists(path):
        try:
            model = joblib.load(path)
            logger.info(f" MODEL LOADED: {path}")
            break
        except Exception as e:
            logger.error(f" Found {path} but failed to load: {e}")

if not model:
    logger.critical("FATAL: Model not found. Stopping server.")
    sys.exit(1)

app = FastAPI()

origins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "https://plscheckin-2ldzhnzp6-yuxunns-projects.vercel.app"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex="https://.*\.vercel\.app"
)

class BookingInput(BaseModel):
    branch: str
    booking_month: str
    arrival_month: str
    arrival_day: int
    checkout_month: str
    checkout_day: int
    country: str
    first_time: str
    room: str
    price: float
    platform: str
    num_adults: int
    num_children: float

@app.get("/")
def read_root():
    return {
        "status": "active", 
        "model_loaded": True,
        "agent_active": agent is not None,
        "agent_error": agent_init_error
    }

@app.post("/predict")
async def predict(booking: BookingInput):
    try:
        input_dict = {
            'branch': booking.branch,
            'booking_month': booking.booking_month,
            'arrival_month': booking.arrival_month,
            'arrival_day': booking.arrival_day,
            'checkout_month': booking.checkout_month,
            'checkout_day': booking.checkout_day,
            'country': booking.country,
            'first_time': booking.first_time,
            'room': booking.room,
            'price': booking.price,
            'platform': booking.platform,
            'num_adults': booking.num_adults,
            'num_children': booking.num_children
        }
        
        df = pd.DataFrame([input_dict])
        df_clean = clean_data(df)
        df_final = engineer_features(df_clean)
        
        if hasattr(model, "predict_proba"):
            prob = model.predict_proba(df_final)[0][1]
        else:
            pred = model.predict(df_final)[0]
            prob = 1.0 if pred == 1 else 0.0
        threshold = getattr(model, "best_threshold_", 0.35)
        
        prediction = "No-Show" if prob >= threshold else "Check-In"
        
        logger.info(f"RESULT: Prob={prob:.4f} | Threshold={threshold} | Pred={prediction}")
        
        return {
            "prediction": prediction,
            "probability": float(prob),
            "threshold": threshold
        }
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Model Logic Error: {str(e)}")

@app.get("/api/analysis")
async def get_analysis():
    """
    Interacts with the GenAI module to interpret model feature importance.
    """
    if not agent:
        error_msg = agent_init_error if agent_init_error else "GenAI Agent not initialized (Check logs)."
        return {"report": f"Agent Error: {error_msg}"}
        
    try:
        feats = []
        if hasattr(model, 'named_steps') and 'preprocessor' in model.named_steps:
             try:
                 feats = list(model.named_steps['preprocessor'].get_feature_names_out())
             except:
                 pass
        
        if not feats:
            feats = ["arrival_month", "price", "country", "branch", "platform", "room"]
            
        report = agent.interpret_model_results(feats)
        return {"report": report}
    except Exception as e:
        logger.error(f"Agent analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return {"report": f"Analysis failed: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)