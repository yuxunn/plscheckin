import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer

def clean_data(df):
    df = df.copy()
    
    if 'no_show' in df.columns:
        df = df.dropna(subset=['no_show'])

    for col in ['arrival_month', 'booking_month']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.title()

    word_map = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
        'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
        'zero': 0, 'none': 0
    }
    for col in ['num_adults', 'num_children']:
        if col in df.columns:
            df[col] = df[col].astype(str).str.lower().str.strip().replace(word_map)
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

    if 'price' in df.columns:
        is_usd = df['price'].astype(str).str.contains('USD', case=False, na=False)
        df['price_clean'] = df['price'].astype(str).str.replace(r'[^\d.]', '', regex=True)
        df['price_numeric'] = pd.to_numeric(df['price_clean'], errors='coerce')
        df['price'] = np.where(is_usd, df['price_numeric'] * 1.35, df['price_numeric'])
        
        if 'room' in df.columns:
            df['room'] = df['room'].fillna("Unknown")
            df['price'] = df['price'].fillna(df.groupby('room')['price'].transform('median'))
        df['price'] = df['price'].fillna(df['price'].median())
        df = df.drop(columns=['price_clean', 'price_numeric'])
    
    cat_cols = df.select_dtypes(include=['object']).columns
    df[cat_cols] = df[cat_cols].fillna("Unknown")

    return df

def engineer_features(df):
    df = df.copy()
    
    if 'num_adults' in df.columns and 'num_children' in df.columns:
        df['total_guests'] = df['num_adults'] + df['num_children']
    
    if 'price' in df.columns and 'total_guests' in df.columns:
        df['price_per_guest'] = df['price'] / df['total_guests'].replace(0, 1)

    month_map = {
        'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
        'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
    }
    if 'arrival_month' in df.columns and 'booking_month' in df.columns:
        arr = df['arrival_month'].map(month_map).fillna(0)
        book = df['booking_month'].map(month_map).fillna(0)
        df['lead_time_month'] = (arr - book) % 12
        
        df['is_peak_season'] = df['arrival_month'].isin(['December', 'June', 'July']).astype(int)

    if 'country' in df.columns and 'branch' in df.columns:
        df['country_branch'] = df['country'].astype(str) + "_" + df['branch'].astype(str)

    if 'lead_time_month' in df.columns:
        df['booking_type'] = pd.cut(df['lead_time_month'], 
                                   bins=[-1, 2, 6, 13], 
                                   labels=['LastMinute', 'Standard', 'EarlyBird']).astype(str)

    return df

def get_preprocessor(cat_cols, num_cols):
    categorical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='constant', fill_value='Unknown')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])

    numerical_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ])

    return ColumnTransformer(
        transformers=[
            ('num', numerical_transformer, num_cols),
            ('cat', categorical_transformer, cat_cols)
        ]
    )