from fastapi import FastAPI, UploadFile, File
from apps.plate_identity.plate_recognition.ocr import extract_plate_text
from apps.plate_identity.database.queries import is_plate_authorized
from apps.plate_identity.schemas.plate import PlateMatchResponse
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/plates/match", response_model=PlateMatchResponse)
async def match_plate(file: UploadFile = File(...)):
    plate_text = extract_plate_text(file.file)
    if not plate_text:
        return PlateMatchResponse(plate="", authorized=False)
    authorized = is_plate_authorized(plate_text)
    return PlateMatchResponse(plate=plate_text, authorized=authorized)