import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from data_preprocessing import preprocess_data, create_sample_data


class SalaryPredictionDL:
    """Deep Learning model for salary prediction using Keras/TensorFlow."""

    def __init__(self, max_tokens=10000, embedding_dim=128, sequence_length=250):
        self.max_tokens = max_tokens
        self.embedding_dim = embedding_dim
        self.sequence_length = sequence_length
        self.model = None
        self.text_vectorizer = None
        self.is_trained = False

    def build_model(self):
        """Build the Keras model with TextVectorization, Embedding, and Dense layers."""
        # Input layer for text (keywords or description)
        text_input = keras.Input(shape=(), dtype=tf.string, name="text")

        # TextVectorization layer
        self.text_vectorizer = layers.TextVectorization(
            max_tokens=self.max_tokens,
            output_mode="int",
            output_sequence_length=self.sequence_length,
        )
        vectorized_text = self.text_vectorizer(text_input)

        # Embedding layer
        embedding = layers.Embedding(
            input_dim=self.max_tokens, output_dim=self.embedding_dim, name="embedding"
        )(vectorized_text)

        # GlobalAveragePooling1D to reduce sequence dimension
        pooled = layers.GlobalAveragePooling1D(name="pooling")(embedding)

        # Dense layers
        dense1 = layers.Dense(128, activation="relu", name="dense1")(pooled)
        dropout1 = layers.Dropout(0.3, name="dropout1")(dense1)

        dense2 = layers.Dense(64, activation="relu", name="dense2")(dropout1)
        dropout2 = layers.Dropout(0.2, name="dropout2")(dense2)

        # Output layer (regression)
        output = layers.Dense(1, name="output")(dropout2)

        # Create model
        self.model = keras.Model(inputs=text_input, outputs=output)

        # Compile model
        self.model.compile(optimizer="adam", loss="mse", metrics=["mae"])

        print("Deep Learning model built successfully!")
        self.model.summary()

    def adapt_vectorizer(self, texts):
        """Adapt the TextVectorization layer to the training data."""
        if self.text_vectorizer is None:
            raise ValueError("Model must be built first")

        self.text_vectorizer.adapt(texts)
        print(
            f"TextVectorization adapted with {len(self.text_vectorizer.get_vocabulary())} tokens"
        )

    def train(self, X_train, y_train, X_val=None, y_val=None, epochs=20, batch_size=32):
        """Train the deep learning model."""
        if self.model is None:
            self.build_model()

        # Combine text features (use keywords + description)
        train_texts = X_train["keywords"] + " " + X_train["description"]

        # Adapt vectorizer to training data
        self.adapt_vectorizer(train_texts)

        # Prepare validation data if provided
        validation_data = None
        if X_val is not None and y_val is not None:
            val_texts = X_val["keywords"] + " " + X_val["description"]
            validation_data = (val_texts, y_val)

        # Train model
        history = self.model.fit(
            train_texts,
            y_train,
            validation_data=validation_data,
            epochs=epochs,
            batch_size=batch_size,
            verbose=1,
        )

        self.is_trained = True
        print("Deep Learning model trained successfully!")
        return history

    def predict(self, X):
        """Make predictions."""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")

        # Combine text features
        texts = X["keywords"] + " " + X["description"]
        return self.model.predict(texts).flatten()

    def evaluate(self, X_test, y_test):
        """Evaluate the model and return metrics."""
        if not self.is_trained:
            raise ValueError("Model must be trained before evaluation")

        y_pred = self.predict(X_test)

        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)

        print(f"DL Model Evaluation:")
        print(f"Mean Absolute Error: ${mae:,.2f}")
        print(f"R-squared: {r2:.4f}")

        return mae, r2

    def plot_training_history(self, history):
        """Plot training history (optional, requires matplotlib)."""
        try:
            import matplotlib.pyplot as plt

            fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))

            # Plot loss
            ax1.plot(history.history["loss"], label="Training Loss")
            if "val_loss" in history.history:
                ax1.plot(history.history["val_loss"], label="Validation Loss")
            ax1.set_title("Model Loss")
            ax1.set_xlabel("Epoch")
            ax1.set_ylabel("Loss")
            ax1.legend()

            # Plot MAE
            ax2.plot(history.history["mae"], label="Training MAE")
            if "val_mae" in history.history:
                ax2.plot(history.history["val_mae"], label="Validation MAE")
            ax2.set_title("Model MAE")
            ax2.set_xlabel("Epoch")
            ax2.set_ylabel("MAE")
            ax2.legend()

            plt.tight_layout()
            plt.show()

        except ImportError:
            print("Matplotlib not available for plotting")


def test_dl_model():
    """Test the Deep Learning model with sample data."""
    print("Testing Deep Learning Model...")

    # Create sample data
    df = create_sample_data(1000)
    features, target = preprocess_data(df)

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        features, target, test_size=0.2, random_state=42
    )

    # Further split training for validation
    X_train, X_val, y_train, y_val = train_test_split(
        X_train, y_train, test_size=0.2, random_state=42
    )

    # Create and train model
    model = SalaryPredictionDL(max_tokens=5000, embedding_dim=64, sequence_length=100)

    history = model.train(
        X_train,
        y_train,
        X_val,
        y_val,
        epochs=10,  # Reduced for testing
        batch_size=32,
    )

    # Evaluate model
    mae, r2 = model.evaluate(X_test, y_test)

    # Optional: Plot training history
    # model.plot_training_history(history)

    return model, mae, r2


if __name__ == "__main__":
    test_dl_model()
