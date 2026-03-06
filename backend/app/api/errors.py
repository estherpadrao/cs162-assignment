from flask import jsonify


def error_response(status_code, message=None):
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
    return error_response(400, message)
