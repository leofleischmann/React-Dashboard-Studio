"""Clear saved dashboard projects from HA frontend user-data storage."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.const import STORAGE_DIR
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import STORAGE_FILE_SUFFIX

from homeassistant.components.frontend.storage import async_user_store

from .const import STORAGE_KEY

_LOGGER = logging.getLogger(__name__)
_STORAGE_PREFIX = "frontend.user_data_"


@callback
def _user_ids_from_storage(hass: HomeAssistant) -> set[str]:
    """User IDs with a frontend user-data storage file."""
    storage_path = Path(hass.config.path(STORAGE_DIR))
    if not storage_path.is_dir():
        return set()

    suffix_len = len(STORAGE_FILE_SUFFIX)
    ids: set[str] = set()
    for path in storage_path.glob(f"{_STORAGE_PREFIX}*{STORAGE_FILE_SUFFIX}"):
        user_id = path.name[len(_STORAGE_PREFIX) : -suffix_len]
        if user_id:
            ids.add(user_id)
    return ids


async def async_reset_all_dashboard_projects(hass: HomeAssistant) -> int:
    """Remove saved dashboard code for every HA user. Returns users cleared."""
    user_ids = _user_ids_from_storage(hass)
    for user in hass.auth.async_get_users():
        user_ids.add(user.id)

    cleared = 0
    for user_id in user_ids:
        try:
            store = await async_user_store(hass, user_id)
        except Exception:  # noqa: BLE001 — skip broken stores
            _LOGGER.warning(
                "Could not load frontend user store for %s", user_id, exc_info=True
            )
            continue

        if not store.data.get(STORAGE_KEY):
            continue

        await store.async_set_item(STORAGE_KEY, None)
        cleared += 1
        _LOGGER.info("Reset dashboard project for user %s", user_id)

    return cleared
