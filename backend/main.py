from contextlib import asynccontextmanager
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from db import get_db_pool

# holds the db connection pool, managed via lifespan
pool = None

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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"], # can tighten this to "get" later
    allow_headers=["*"],
)


@app.get("/parcels")
async def get_parcels(
    user_role: str = Query("guest", description="Role: 'guest' or 'registered'"), 
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