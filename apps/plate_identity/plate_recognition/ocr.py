import easyocr
import re
from PIL import Image
import numpy as np

reader = None

# Regex para placas brasileñas (Mercosul y tradicional) y bolivianas (4 números + 3 letras)
PLATE_REGEX = re.compile(
    r"([A-Z]{3}[0-9][A-Z0-9][0-9]{2})|"    # Brasil Mercosul
    r"([A-Z]{3}[0-9]{4})|"                 # Brasil antiguo
    r"([0-9]{4}[A-Z]{3})"                  # Bolivia
)

def get_reader():
    global reader
    if reader is None:
        # Carga EasyOCR solo la primera vez (y solo cuando se usa)
        # Idiomas: portugués, español, inglés para mejores resultados en la región
        reader = easyocr.Reader(['en', 'pt', 'es'], gpu=False)
    return reader

def extract_plate_text(image_bytes):
    image = Image.open(image_bytes)
    img_np = np.array(image)
    results = get_reader().readtext(img_np)
    # Buscar textos que cumplan el patrón de placa
    for _, text, _ in results:
        plate_candidate = text.replace(" ", "").replace("-", "").upper()
        if PLATE_REGEX.fullmatch(plate_candidate):
            return plate_candidate
    # Si no hay match, devuelve None
    return None