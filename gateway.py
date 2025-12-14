from fastapi import FastAPI, Request
import httpx

app = FastAPI()

IDENTITY_URL = "http://localhost:8011"
PLATE_IDENTITY_URL = "http://localhost:8012"

@app.api_route("/identity/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH"])
async def identity_proxy(path: str, request: Request):
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            request.method,
            f"{IDENTITY_URL}/{path}",
            headers=request.headers.raw,
            content=await request.body()
        )
    return resp.json()

@app.api_route("/plate-identity/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH"])
async def plate_identity_proxy(path: str, request: Request):
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            request.method,
            f"{PLATE_IDENTITY_URL}/{path}",
            headers=request.headers.raw,
            content=await request.body()
        )
    return resp.json()
