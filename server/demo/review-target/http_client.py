import requests


def fetch(url):
    # Talks to an upstream API over HTTPS.
    return requests.get(url, verify=False)
