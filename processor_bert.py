from sentence_transformers import SentenceTransformer
import joblib

# Load the sentence tranformer model to compute log_message embeddings:
tranformer_model = SentenceTransformer('all-MiniLM-L6-v2')

# Load the saved classification model:
classifier_model = joblib.load('models/log_classifier.joblib')


# Creating a function tp classify the log message based on the BERT Model:
def classify_with_bert(log_message):

    # Obtaining the message embeddings:
    message_embedding = tranformer_model.encode(log_message)

    # Obtaining the probabilities of each class:
    probabilities = classifier_model.predict_proba([message_embedding])[0]

    # Creating a variable to keep the track of predicted class:
    predicted_class = "Unclassified"

    # If the maximum probablity out of all classes probabilities is greater than 0.5:
    if max(probabilities) > 0.5:

        # Obtaining the predicted class:
        predicted_class = classifier_model.predict([message_embedding])[0]

    # Returnign the predicted class:
    return predicted_class
