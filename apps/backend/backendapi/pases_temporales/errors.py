# backendapi/pases_temporales/errors.py
class AppError(Exception):
    http_status = 400

    def __init__(self, message: str, http_status: int | None = None):
        super().__init__(message)
        if http_status:
            self.http_status = http_status


class ValidationError(AppError):
    http_status = 400


class ForbiddenError(AppError):
    http_status = 403


class NotFoundError(AppError):
    http_status = 404


class UpstreamError(AppError):
    http_status = 502  # error en servicio externo / BD
