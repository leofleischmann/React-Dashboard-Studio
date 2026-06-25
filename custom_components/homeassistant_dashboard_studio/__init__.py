"""The Home Assistant Dashboard Studio integration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import DOMAIN, SIGNAL_WORKSPACE_UPDATED
from .panels import async_sync_sidebar_panels, async_unregister_all_panels
from .store import DashboardStore
from . import websocket_api

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Home Assistant Dashboard Studio from a config entry."""
    store = DashboardStore(hass)
    await store.async_load()
    hass.data.setdefault(DOMAIN, {})["store"] = store
    websocket_api.async_setup(hass)

    workspace = await store.async_get_workspace()
    await async_sync_sidebar_panels(hass, workspace)

    def _on_workspace_updated(workspace: dict | None) -> None:
        hass.async_create_task(async_sync_sidebar_panels(hass, workspace))

    unsub = async_dispatcher_connect(hass, SIGNAL_WORKSPACE_UPDATED, _on_workspace_updated)
    hass.data[DOMAIN]["workspace_listener"] = unsub

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the config entry."""
    domain_data = hass.data.get(DOMAIN, {})
    unsub = domain_data.pop("workspace_listener", None)
    if unsub:
        unsub()
    await async_unregister_all_panels(hass)
    domain_data.pop("store", None)
    return True
