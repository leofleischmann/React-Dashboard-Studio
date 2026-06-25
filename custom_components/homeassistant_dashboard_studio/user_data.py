"""Clear saved dashboard projects from HA frontend user-data storage."""

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant

from .const import STORAGE_KEY

_LOGGER = logging.getLogger(__name__)


async def async_reset_all_dashboard_projects(hass: HomeAssistant) -> int:
    """Remove saved dashboard code for every HA user. Returns users cleared."""
    # Lazy import — keeps config_flow import lightweight (HA warns on blocking imports).
    from homeassistant.components.frontend.storage import async_user_store

    cleared = 0
    for user in await hass.auth.async_get_users():
        try:
            store = await async_user_store(hass, user.id)
        except Exception:  # noqa: BLE001 — skip broken stores
            _LOGGER.warning(
                "Could not load frontend user store for %s", user.id, exc_info=True
            )
            continue

        if not store.data.get(STORAGE_KEY):
            continue

        await store.async_set_item(STORAGE_KEY, None)
        cleared += 1
        _LOGGER.info("Reset dashboard project for user %s", user.id)

    return cleared
