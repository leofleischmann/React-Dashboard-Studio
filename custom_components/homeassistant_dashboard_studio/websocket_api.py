"""WebSocket API — global dashboard read/write for panel and sync scripts."""

from __future__ import annotations

import voluptuous as vol  # pyright: ignore[reportMissingImports]

from homeassistant.components import websocket_api  # pyright: ignore[reportMissingImports]
from homeassistant.core import HomeAssistant, callback  # pyright: ignore[reportMissingImports]
from homeassistant.helpers.dispatcher import async_dispatcher_connect  # pyright: ignore[reportMissingImports]

from .const import (
    DOMAIN,
    SIGNAL_PROJECT_UPDATED,
    WS_TYPE_GET_PROJECT,
    WS_TYPE_SAVE_PROJECT,
    WS_TYPE_SUBSCRIBE_PROJECT,
)


def async_setup(hass: HomeAssistant) -> None:
    """Register websocket commands."""
    websocket_api.async_register_command(hass, ws_get_project)
    websocket_api.async_register_command(hass, ws_save_project)
    websocket_api.async_register_command(hass, ws_subscribe_project)


@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_GET_PROJECT})
@websocket_api.async_response
async def ws_get_project(hass: HomeAssistant, connection, msg: dict) -> None:
    """Return the global dashboard project (all HA users see the same code)."""
    store = hass.data[DOMAIN]["store"]
    project = await store.async_get()
    connection.send_result(msg["id"], {"project": project})


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SAVE_PROJECT,
        vol.Required("project"): dict,
    }
)
@websocket_api.async_response
async def ws_save_project(hass: HomeAssistant, connection, msg: dict) -> None:
    """Save the global dashboard project."""
    store = hass.data[DOMAIN]["store"]
    try:
        await store.async_save(msg["project"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_project", str(err))
        return
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_SUBSCRIBE_PROJECT})
@websocket_api.async_response
async def ws_subscribe_project(hass: HomeAssistant, connection, msg: dict) -> None:
    """Push project updates (save, reset, sync) to connected clients."""

    @callback
    def forward(project: dict | None) -> None:
        connection.send_message(
            websocket_api.event_message(msg["id"], {"project": project})
        )

    unsub = async_dispatcher_connect(hass, SIGNAL_PROJECT_UPDATED, forward)
    connection.subscriptions[msg["id"]] = unsub

    store = hass.data[DOMAIN]["store"]
    project = await store.async_get()
    connection.send_message(
        websocket_api.event_message(msg["id"], {"project": project})
    )
