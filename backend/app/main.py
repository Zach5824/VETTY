from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routes import auth, admin, tracks, interactions

# Initialize tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Studio Manager API", version="1.0.0")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach Routes
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(tracks.router)
app.include_router(interactions.router)

@app.get("/")
def root():
    return {"message": "Studio Manager API is running..."}