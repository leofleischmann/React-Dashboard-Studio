"""Integration options helpers — debug flag, reset counter, websocket payloads."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant

from .const import CONF_DEBUG_LOGS, CONF_RESET_COUNT, DOMAIN
from .panels import async_sync_sidebar_panels

_LOGGER = logging.getLogger(__name__)


def _config_entry_options(hass: HomeAssistant) -> dict[str, Any]:
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        return {}
    return dict(entries[0].options or {})


def integration_debug_logs(hass: HomeAssistant) -> bool:
    """Whether dashboard `db.*` calls may write to the browser console."""
    return bool(_config_entry_options(hass).get(CONF_DEBUG_LOGS, False))


def factory_reset_count(hass: HomeAssistant) -> int:
    """Monotonic counter bumped on each factory reset (stored in config entry options)."""
    raw = _config_entry_options(hass).get(CONF_RESET_COUNT, 0)
    try:
        return int(raw)
    except (TypeError, ValueError):
        return 0


def workspace_message(hass: HomeAssistant, workspace: dict[str, Any] | None) -> dict[str, Any]:
    """WebSocket payload for get/subscribe workspace events."""
    return {
        "workspace": workspace,
        "reset_count": factory_reset_count(hass),
        "debug_logs": integration_debug_logs(hass),
    }


def _remove_all_domain_storage_files(hass: HomeAssistant) -> None:
    """Delete every .storage file for this domain (current + legacy names)."""
    storage_dir = Path(hass.config.config_dir) / ".storage"
    if not storage_dir.is_dir():
        return
    for path in storage_dir.iterdir():
        if path.is_file() and path.name.startswith(DOMAIN):
            path.unlink(missing_ok=True)
            _LOGGER.debug("Removed storage file %s", path.name)


async def async_reset_dashboard_workspace(hass: HomeAssistant) -> None:
    """Clear all persisted integration data — as after a fresh install."""
    store = hass.data[DOMAIN]["store"]
    await store.async_clear()
    _remove_all_domain_storage_files(hass)
    await async_sync_sidebar_panels(hass, None)
    _LOGGER.info("Dashboard Studio factory reset complete")
