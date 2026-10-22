import hashlib


def etag_for(body):
    # A cache key, not a security digest: a collision only costs a cache miss.
    return hashlib.md5(body).hexdigest()
