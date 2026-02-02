import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

async def get_db_pool():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not set in environment variables")
    
    # create a connection pool
    return await asyncpg.create_pool(DATABASE_URL)