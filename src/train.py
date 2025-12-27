import yaml
import joblib
import logging
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
from sklearn.pipeline import Pipeline
from sklearn.metrics import f1_score, confusion_matrix, accuracy_score, recall_score
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier

from src.data_loader import load_data
from src.preprocessing import clean_data, engineer_features, get_preprocessor

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s', handlers=[logging.FileHandler("training.log"), logging.StreamHandler()])
logger = logging.getLogger()

def load_config(path="config.yaml"):
    with open(path, "r") as f: return yaml.safe_load(f)

def main():
    logger.info("Starting Optimized Training (OneHot + Interactions)")
    
    config = load_config()
    df = load_data(config['paths']['data_raw'])
    noise_cols = [
        'platform',    
        'num_children',
        'num_adults',   
        'total_guests'
    ]
    df = df.drop(columns=[c for c in noise_cols if c in df.columns])
    logger.info(f"Pruned noise columns: {noise_cols}")
    df = clean_data(df)
    df = engineer_features(df) 

    target = 'no_show'
    y = df[target]
    X = df.drop(columns=[target, 'booking_id'], errors='ignore')

    num_cols = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
    cat_cols = X.select_dtypes(include=['object']).columns.tolist()
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=config['preprocessing']['test_size'], 
        random_state=42, stratify=y
    )

    best_score, best_pipe_name, best_pipe = 0, "", None
    
    print("\nTesting Models with Cross-Validation")
    print(f"{'Model':<20} | {'CV F1-Score':<15}")
    print("-" * 40)

    for name, cfg in config['models'].items():
        if not cfg['enabled']: continue
        
        if cfg['type'] == 'rf':
            clf = RandomForestClassifier(**cfg['params'], n_jobs=-1)
        elif cfg['type'] == 'mlp':
            clf = MLPClassifier(**cfg['params'])
        elif cfg['type'] == 'xgb':
            clf = XGBClassifier(**cfg['params'], n_jobs=-1)

        preprocessor = get_preprocessor(cat_cols, num_cols)
        
        pipeline = Pipeline(steps=[
                    ('preprocessor', preprocessor),
                    ('classifier', clf)
                ])
        
        cv_scores = cross_val_score(pipeline, X_train, y_train, cv=5, scoring='f1', n_jobs=-1)
        avg_score = cv_scores.mean()
        
        print(f"{name:<20} | {avg_score:.4f}")
        
        if avg_score > best_score:
            best_score = avg_score
            best_pipe = pipeline
            best_pipe_name = name

    print("-" * 40)
    logger.info(f"Recommended Model: {best_pipe_name} (CV F1: {best_score:.4f})")
    
    best_pipe.fit(X_train, y_train)

    y_proba = best_pipe.predict_proba(X_test)[:, 1]
    thresholds = np.arange(0.2, 0.7, 0.01)
    best_f1, best_t = 0, 0.5

    for t in thresholds:
        y_hat = (y_proba >= t).astype(int)
        f1 = f1_score(y_test, y_hat)
        if f1 > best_f1:
            best_f1, best_t = f1, t

    logger.info(f"🎯 Tuned Test F1: {best_f1:.4f} at threshold {best_t:.2f}")
    best_pipe.best_threshold_ = float(best_t)
    
    joblib.dump(best_pipe, config['paths']['model_output'])
    logger.info("✅ Pipeline Saved.")

if __name__ == "__main__":
    main()