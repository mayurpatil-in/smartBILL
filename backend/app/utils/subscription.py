from datetime import date
from app.models.company import Company


def is_subscription_valid(company: Company) -> bool:
    today = date.today()

    if not company.is_active:
        return False

    if company.subscription_start > today:
        return False

    if company.subscription_end < today:
        return False

    return True
