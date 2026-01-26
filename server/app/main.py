import os

from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import users, feed

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("")
    yield 
    print("")

def create_app() -> FastAPI:

    app = FastAPI(lifespan=lifespan)

    app.include_router(users.router, prefix="/users", tags=["users"])
    app.include_router(feed.router, prefix="/feed", tags=["feed"])

    @app.get("/")
    def root():
        return { "status": "up" }

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://localhost:5173"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )
    
    return app

load_dotenv() 

# uvicorn main:app --host 0.0.0.0 --port 6969 --reload
app = create_app()