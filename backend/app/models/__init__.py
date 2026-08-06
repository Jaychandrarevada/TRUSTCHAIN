"""Model registry — importing this package registers all tables with SQLAlchemy."""
from app.models.base import BaseModel, SoftDeleteMixin, utcnow  # noqa: F401
from app.models.user import (  # noqa: F401
    Permission,
    RefreshSession,
    Role,
    RolePermission,
    User,
    UserRole,
    Wallet,
    WalletChallenge,
)
from app.models.institution import Employer, Institution  # noqa: F401
from app.models.certificate import Batch, Certificate, CertificateHistory  # noqa: F401
from app.models.logs import (  # noqa: F401
    ActivityLog,
    Notification,
    ShareLink,
    SystemSetting,
    VerificationLog,
)
