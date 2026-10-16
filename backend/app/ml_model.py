import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def build_recommendation_model(vendors):
    if len(vendors) < 2:
        return pd.DataFrame(vendors), None

    df = pd.DataFrame(vendors)

    df["features"] = df["cuisine_type"].fillna('') + " " + df["description"].fillna('')

    try:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(df["features"])
        similarity = cosine_similarity(tfidf_matrix)
        return df, similarity
    except Exception as e:
        print(f"ML model build failed: {e}")
        return df, None


def get_recommendations(vendor_id, df, similarity, count=5):
    """Ids of the vendors most similar to `vendor_id` (callers serialize them for the viewer)."""
    if similarity is None or vendor_id not in df["id"].values:
        return []

    try:
        idx = df[df["id"] == vendor_id].index[0]

        scores = list(enumerate(similarity[idx]))
        scores = sorted(scores, key=lambda x: x[1], reverse=True)

        return [int(df.iloc[i]["id"]) for i, _ in scores[1:count + 1]]
    except Exception as e:
        print(f"ML recommendation failed: {e}")
        return []
