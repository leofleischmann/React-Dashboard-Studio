"""Reset the global dashboard project (integration options)."""

from __future__ import annotations

import logging

from homeassistant.core import HomeAssistant

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_reset_dashboard_project(hass: HomeAssistant) -> None:
    """Clear the instance-wide dashboard — panel falls back to bundled default."""
    store = hass.data[DOMAIN]["store"]
    await store.async_clear()
    _LOGGER.info("[Debug dashboard_reset]: global project cleared")
