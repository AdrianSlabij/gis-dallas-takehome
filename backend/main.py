import requests
from typing import Optional
from typing_extensions import Annotated
from fastapi import FastAPI, Depends, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError
from contextlib import asynccontextmanager
from db import get_db_pool
import os
from dotenv import load_dotenv

load_dotenv()
AWS_REGION = os.environ.get("AWS_REGION")
USER_POOL_ID = os.environ.get("USER_POOL_ID")
CLIENT_ID = os.environ.get("CLIENT_ID")

if not AWS_REGION or not USER_POOL_ID or not CLIENT_ID:
    raise ValueError("Missing AWS Configuration. Check .env file.")

# holds the db connection pool, managed via lifespan
pool = None

# URL to get AWS's public signing keys
JWKS_URL = f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{USER_POOL_ID}/.well-known/jwks.json"
jwks_keys = requests.get(JWKS_URL).json()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the lifecycle of the application.
    Initializes the DB pool on startup and closes it on shutdown.
    """
    global pool
    pool = await get_db_pool()
    print("Database pool created")
    yield
    await pool.close()
    print("Database pool closed")

app = FastAPI(lifespan=lifespan)

#CORS Configuration
# To do: Move origins to environment variables for production deployments.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # adjust this in production
    allow_credentials=True,
    allow_methods=["*"], # can tighten this to "get" later
    allow_headers=["*"],
)

async def get_current_user_role(authorization: Optional[str] = Header(None)):
    """
    Determines user permissions based on Cognito JWT.
    ensure map availability even if auth is bypassed or expired.
    guest: limited access to Dallas county parcels only.
    registered: full access with more counties and higher limits.
    """
    if not authorization:
        print("DEBUG: No Authorization header found.")
        return "guest"

    try:
        # 'Bearer <token>' format.
        token = authorization.split(" ")[1]
        
        # print(f"DEBUG: Token received: {token[:10]}...")
        
        claims = jwt.decode(
            token, 
            jwks_keys, 
            algorithms=["RS256"], 
            audience=CLIENT_ID,
            options={"verify_at_hash": False}
        )
        
        print("DEBUG: Token verified successfully! Role is Registered.")
        return "registered"
            
    except Exception as e:
        # fall back to guest role to maintain public view access
        print(f"DEBUG: Verification Failed. Error: {str(e)}")
        return "guest"


@app.get("/parcels")
async def get_parcels(
    user_role: str = Depends(get_current_user_role), 
    limit: int = 600, #response size for registered users
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_sqft: Optional[float] = None,
    max_sqft: Optional[float] = None,
    county: Optional[str] = None
):
    """
    Fetches parcel data with dynamic filtering
    """

    if not pool:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    # base query, append filters dynamically
    query = """
        SELECT 
            sl_uuid, 
            address, 
            county, 
            sqft, 
            total_value, 
            public.ST_AsGeoJSON(geom) as geometry
        FROM takehome.dallas_parcels
        WHERE 1=1
    """
    
    params = []
    
    # guest users are restricted to Dallas county records by default
    if user_role == "guest":
        query += " AND county = 'dallas'"
        limit = 200 # force results to 200 for guests

    # specific county filter
    if county and county.lower() != "all":
        params.append(county.lower()) 
        query += f" AND LOWER(county) = ${len(params)}"

    # price filters
    if min_price is not None:
        params.append(min_price)
        query += f" AND total_value >= ${len(params)}"
        
    if max_price is not None:
        params.append(max_price)
        query += f" AND total_value <= ${len(params)}"
    
    # sqft filters
    if min_sqft is not None:
        params.append(min_sqft)
        query += f" AND sqft >= ${len(params)}"
        
    if max_sqft is not None:
        params.append(max_sqft)
        query += f" AND sqft <= ${len(params)}"

    # apply limit
    params.append(limit)
    query += f" LIMIT ${len(params)}"

    async with pool.acquire() as connection:
        rows = await connection.fetch(query, *params)
        
    results = [
        {
            "id": str(row["sl_uuid"]),
            "address": row["address"],
            "county": row["county"],
            "sqft": row["sqft"],
            "price": row["total_value"],
            "geometry": row["geometry"] 
        }
        for row in rows
    ]

    return {"count": len(results), "data": results}