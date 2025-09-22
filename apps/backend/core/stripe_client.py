import os, stripe
stripe.api_key = os.getenv("STRIPE_TEST_SECRET_KEY")
__all__ = ["stripe"]
