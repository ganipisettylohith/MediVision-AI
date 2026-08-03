from slowapi import Limiter
from slowapi.util import get_remote_address

# Share a single rate limiter across main app and endpoints
limiter = Limiter(key_func=get_remote_address)
