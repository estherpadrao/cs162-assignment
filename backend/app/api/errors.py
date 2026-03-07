from flask import jsonify


def error_response(status_code, message=None):
    """Build a JSON error response with the given HTTP status code.

    Args:
        status_code (int): The HTTP status code to return (e.g. 400, 401, 403, 404).
        message (str | None): Custom error message. Falls back to a default
                              message for known status codes if omitted.

    Returns:
        flask.Response: A JSON response with an 'error' key and the given status code.
    """
    messages = {
        400: 'Bad request',
        401: 'Unauthorized',
        403: 'Forbidden',
        404: 'Not found',
    }
    payload = {'error': message or messages.get(status_code, 'An error occurred')}
    response = jsonify(payload)
    response.status_code = status_code
    return response


def bad_request(message):
    """Build a 400 Bad Request JSON error response.

    Args:
        message (str): A description of what was wrong with the request.

    Returns:
        flask.Response: A JSON response with status 400 and an 'error' key.
    """
    return error_response(400, message)
