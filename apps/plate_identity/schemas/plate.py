from pydantic import BaseModel

class PlateMatchResponse(BaseModel):
    plate: str
    authorized: bool