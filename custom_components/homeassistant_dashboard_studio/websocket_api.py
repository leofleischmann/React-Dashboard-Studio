"""WebSocket API — global dashboard workspace for panel and sync scripts."""

from __future__ import annotations

import voluptuous as vol  # pyright: ignore[reportMissingImports]

from homeassistant.components import websocket_api  # pyright: ignore[reportMissingImports]
from homeassistant.core import HomeAssistant, callback  # pyright: ignore[reportMissingImports]
from homeassistant.helpers.dispatcher import async_dispatcher_connect  # pyright: ignore[reportMissingImports]

from .const import (
    DOMAIN,
    SIGNAL_WORKSPACE_UPDATED,
    WS_TYPE_GET_WORKSPACE,
    WS_TYPE_SAVE_WORKSPACE,
    WS_TYPE_SUBSCRIBE_WORKSPACE,
)


def async_setup(hass: HomeAssistant) -> None:
    """Register websocket commands."""
    websocket_api.async_register_command(hass, ws_get_workspace)
    websocket_api.async_register_command(hass, ws_save_workspace)
    websocket_api.async_register_command(hass, ws_subscribe_workspace)


@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_GET_WORKSPACE})
@websocket_api.async_response
async def ws_get_workspace(hass: HomeAssistant, connection, msg: dict) -> None:
    """Return the global dashboard workspace (all HA users)."""
    store = hass.data[DOMAIN]["store"]
    workspace = await store.async_get_workspace()
    connection.send_result(msg["id"], {"workspace": workspace})


@websocket_api.websocket_command(
    {
        vol.Required("type"): WS_TYPE_SAVE_WORKSPACE,
        vol.Required("workspace"): dict,
    }
)
@websocket_api.async_response
async def ws_save_workspace(hass: HomeAssistant, connection, msg: dict) -> None:
    """Save the global dashboard workspace."""
    store = hass.data[DOMAIN]["store"]
    try:
        await store.async_save_workspace(msg["workspace"])
    except ValueError as err:
        connection.send_error(msg["id"], "invalid_workspace", str(err))
        return
    connection.send_result(msg["id"], {"success": True})


@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_SUBSCRIBE_WORKSPACE})
@websocket_api.async_response
async def ws_subscribe_workspace(hass: HomeAssistant, connection, msg: dict) -> None:
    """Push workspace updates (save, reset, sync) to connected clients."""

    @callback
    def forward(workspace: dict | None) -> None:
        connection.send_message(
            websocket_api.event_message(msg["id"], {"workspace": workspace})
        )

    unsub = async_dispatcher_connect(hass, SIGNAL_WORKSPACE_UPDATED, forward)
    connection.subscriptions[msg["id"]] = unsub

    store = hass.data[DOMAIN]["store"]
    workspace = await store.async_get_workspace()
    connection.send_message(
        websocket_api.event_message(msg["id"], {"workspace": workspace})
    )
