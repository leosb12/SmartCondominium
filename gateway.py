from fastapi import FastAPI, Request, Response
import httpx

app = FastAPI()

IDENTITY_URL = "http://localhost:8011"
PLATE_IDENTITY_URL = "http://localhost:8012"

@app.api_route("/identity/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH"])
async def identity_proxy(path: str, request: Request):
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            method=request.method,
            url=f"{IDENTITY_URL}/{path}",
            headers=dict(request.headers),
            content=await request.body()
        )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=resp.headers
    )

@app.api_route("/plate-identity/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH"])
async def plate_identity_proxy(path: str, request: Request):
    async with httpx.AsyncClient() as client:
        resp = await client.request(
            method=request.method,
            url=f"{PLATE_IDENTITY_URL}/{path}",
            headers=dict(request.headers),
            content=await request.body()
        )
    return Response(
        content=resp.content,
        status_code=resp.status_code,
        headers=resp.headers
    )
