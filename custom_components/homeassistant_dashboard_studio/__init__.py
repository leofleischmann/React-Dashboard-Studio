"""The Home Assistant Dashboard Studio integration."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components import panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

from .const import DOMAIN, PANEL_ICON, PANEL_TAG, PANEL_TITLE, PANEL_URL_PATH
from .store import DashboardStore
from . import websocket_api

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Home Assistant Dashboard Studio from a config entry."""
    store = DashboardStore(hass)
    await store.async_load()
    hass.data.setdefault(DOMAIN, {})["store"] = store
    websocket_api.async_setup(hass)
    await _async_register_panel(hass)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload the config entry."""
    hass.data.get(DOMAIN, {}).pop("store", None)
    return True


async def _async_register_panel(hass: HomeAssistant) -> None:
    """Register the sidebar panel (once per HA instance)."""
    if hass.data.get(DOMAIN, {}).get("panel_registered"):
        return

    panel_dir = Path(__file__).parent
    static_url = f"/{DOMAIN}"

    await hass.http.async_register_static_paths(
        [StaticPathConfig(static_url, str(panel_dir), cache_headers=False)]
    )

    # Versioned bundle filename busts browser/service-worker cache on HACS updates
    # without a ?v= query (that would make studio-editor.js load a second React copy).
    integration = await async_get_integration(hass, DOMAIN)
    module_url = f"{static_url}/dashboard.v{integration.version}.js"

    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_TAG,
        frontend_url_path=PANEL_URL_PATH,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        module_url=module_url,
        require_admin=False,
    )

    hass.data.setdefault(DOMAIN, {})["panel_registered"] = True
    _LOGGER.debug("Home Assistant Dashboard Studio panel registered at /%s", PANEL_URL_PATH)
