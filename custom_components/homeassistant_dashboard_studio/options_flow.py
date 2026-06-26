"""Options flow — debug logging and factory reset."""

from __future__ import annotations

from typing import Any

import voluptuous as vol  # pyright: ignore[reportMissingImports]

from homeassistant import data_entry_flow  # pyright: ignore[reportMissingImports]
from homeassistant.config_entries import OptionsFlow  # pyright: ignore[reportMissingImports]
from homeassistant.helpers import config_validation as cv  # pyright: ignore[reportMissingImports]
from homeassistant.helpers.dispatcher import async_dispatcher_send  # pyright: ignore[reportMissingImports]

from .const import CONF_CONFIRM_RESET, CONF_DEBUG_LOGS, CONF_RESET_COUNT, DOMAIN, SIGNAL_WORKSPACE_UPDATED
from .integration_options import (
    async_reset_dashboard_workspace,
    factory_reset_count,
    integration_debug_logs,
)


class ReactDashboardStudioOptionsFlowHandler(OptionsFlow):
    """Integration options — debug logs and factory reset."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        """Choose debug settings or factory reset."""
        return self.async_show_menu(
            step_id="init",
            menu_options=["debug", "reset"],
        )

    async def async_step_debug(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        """Toggle integration-wide dashboard debug logs (`db.*` in dashboards)."""
        if user_input is not None:
            options = dict(self.config_entry.options or {})
            options[CONF_DEBUG_LOGS] = user_input[CONF_DEBUG_LOGS]
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=options
            )
            await self._notify_workspace_clients()
            return self.async_create_entry(title="", data=options)

        return self.async_show_form(
            step_id="debug",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_DEBUG_LOGS,
                        default=integration_debug_logs(self.hass),
                    ): cv.boolean,
                }
            ),
        )

    async def async_step_reset(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        """Confirm and run factory reset."""
        if user_input is not None:
            if not user_input.get(CONF_CONFIRM_RESET):
                return self.async_show_form(
                    step_id="reset",
                    data_schema=self._reset_schema(),
                    errors={"base": "not_confirmed"},
                )

            options = dict(self.config_entry.options or {})
            options[CONF_RESET_COUNT] = factory_reset_count(self.hass) + 1
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=options
            )
            await async_reset_dashboard_workspace(self.hass)
            return self.async_create_entry(title="", data=options)

        return self.async_show_form(step_id="reset", data_schema=self._reset_schema())

    async def _notify_workspace_clients(self) -> None:
        """Push updated options (e.g. debug_logs) to subscribed panels."""
        store = self.hass.data[DOMAIN]["store"]
        workspace = await store.async_get_workspace()
        async_dispatcher_send(self.hass, SIGNAL_WORKSPACE_UPDATED, workspace)

    @staticmethod
    def _reset_schema() -> vol.Schema:
        return vol.Schema(
            {
                vol.Required(CONF_CONFIRM_RESET, default=False): cv.boolean,
            }
        )
