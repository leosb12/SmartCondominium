from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # en prod poné tu dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

IDENTITY_URL = "http://localhost:8011"
PLATE_IDENTITY_URL = "http://localhost:8012"


@app.api_route("/identity/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH","OPTIONS"])
async def identity_proxy(path: str, request: Request):
    if request.method == "OPTIONS":
        return Response(status_code=200)

    async with httpx.AsyncClient(timeout=60.0) as client:
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


@app.api_route("/plate-identity/{path:path}", methods=["GET","POST","PUT","DELETE","PATCH","OPTIONS"])
async def plate_identity_proxy(path: str, request: Request):
    if request.method == "OPTIONS":
        return Response(status_code=200)

    async with httpx.AsyncClient(timeout=60.0) as client:
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
