# FaktaNesia - AI Hoax Detector

FaktaNesia is a modern web application designed to combat misinformation by detecting potential hoaxes in Indonesian news content. It utilizes a Machine Learning model (TF-IDF + Logistic Regression) served via a Flask backend and presents the results through a premium, glassmorphism-styled React frontend.

![FaktaNesia Logo](frontend/public/assets/img/logo.png)

## Features

- **Real-time Hoax Detection**: Analyze news headlines or full articles instantly.
- **Confidence Score**: Displays the AI's confidence level in its prediction.
- **Premium UI**: A sophisticated Glassmorphism interface with ambient lighting effects.
- **Responsive Design**: Fully optimized for desktop and mobile devices.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion
- **Backend**: Flask (Python), Scikit-Learn, Pandas
- **Model**: TF-IDF Vectorizer + Logistic Regression

## Installation

### Prerequisites

- Python 3.8+
- Node.js 16+

### 1. Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/faktanesia.git
cd faktanesia

# Create virtual environment (optional but recommended)
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend
python app.py
```

The backend server will start at `http://localhost:5001`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```

The frontend will start at `http://localhost:5173`.

## Usage

1.  Open the web application.
2.  Paste a news headline or article body into the text input area.
3.  Click **Verify Content**.
4.  View the result (HOAX or REAL) along with the confidence score.

## Data Sources

The model was trained on a curated dataset comprising:

- **Real News**: Antara News, Detik, Kompas
- **Hoax News**: TurnBackHoax, Kominfo (Komdigi)

## License

MIT License
