import json
from pathlib import Path
from loguru import logger

class UserDatabase:
    def __init__(self, filename="user_data.json"):
        # Determine the appropriate OS-specific data directory
        # For a simple app, we'll use the user's local app data folder/config directory
        self.db_dir = Path.home() / ".warframe_tracker"
        self.db_path = self.db_dir / filename
        self._ensure_dir()

    def _ensure_dir(self):
        """Ensure the database directory exists."""
        if not self.db_dir.exists():
            self.db_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created database directory at {self.db_dir}")

    def save_data(self, data: dict):
        """Save user data to the JSON file."""
        try:
            with open(self.db_path, 'w') as f:
                json.dump(data, f, indent=4)
            logger.info(f"User data successfully saved to {self.db_path}")
        except Exception as e:
            logger.error(f"Error saving user data to {self.db_path}: {e}")

    def load_data(self) -> dict:
        """Load user data from the JSON file."""
        if not self.db_path.exists():
            logger.info("No existing user database found. Starting with empty data.")
            return {}
        try:
            with open(self.db_path, 'r') as f:
                data = json.load(f)
                logger.info(f"User data successfully loaded from {self.db_path}")
                return data
        except Exception as e:
            logger.error(f"Error loading user data from {self.db_path}: {e}")
            return {}

    def clear_data(self):
        """Delete the user database file."""
        try:
            if self.db_path.exists():
                self.db_path.unlink()
                logger.info(f"User database deleted: {self.db_path}")
        except Exception as e:
            logger.error(f"Error deleting user database: {e}")
