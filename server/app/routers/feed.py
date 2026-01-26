from fastapi import APIRouter, Depends
from pydantic import BaseModel

from .users import verify_token

router = APIRouter()


class FeedItem(BaseModel):
    id: str
    title: str
    content: str
    type: str


# Mock feed data - will be role-based in the future
FEED_ITEMS = [
    FeedItem(id="1", title="Welcome to the Platform", content="Get started by exploring your dashboard.", type="announcement"),
    FeedItem(id="2", title="New Feature Released", content="Check out the latest updates to your account settings.", type="update"),
    FeedItem(id="3", title="Weekly Summary", content="Your activity summary for this week is now available.", type="report"),
]


@router.get("", response_model=list[FeedItem])
async def get_feed(claims: dict = Depends(verify_token)):
    """
    Get feed items for the current user.

    TODO: Filter items based on user role from claims.
    Example: claims.get("cognito:groups") returns user's Cognito groups
    """
    # Future: filter based on role
    # user_groups = claims.get("cognito:groups", [])
    # if "admin" in user_groups:
    #     return ADMIN_FEED_ITEMS

    return FEED_ITEMS
