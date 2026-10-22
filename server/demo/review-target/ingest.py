import pickle


def load_session(request):
    # Rebuilds the session object from bytes the client sent.
    return pickle.loads(request.body)
