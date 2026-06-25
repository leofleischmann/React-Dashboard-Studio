"""Options flow — reset saved dashboard to the bundled default."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant import data_entry_flow
from homeassistant.config_entries import ConfigEntry, OptionsFlow
from homeassistant.helpers import config_validation as cv

from .const import CONF_CONFIRM_RESET
from .user_data import async_reset_all_dashboard_projects


class ReactDashboardStudioOptionsFlowHandler(OptionsFlow):
    """Integration options — restore bundled default dashboard."""

    def __init__(self, config_entry: ConfigEntry) -> None:
        self.config_entry = config_entry

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> data_entry_flow.FlowResult:
        """Confirm and reset all saved dashboard projects."""
        if user_input is not None:
            if not user_input.get(CONF_CONFIRM_RESET):
                return self.async_show_form(
                    step_id="init",
                    data_schema=self._schema(),
                    errors={"base": "not_confirmed"},
                )

            cleared = await async_reset_all_dashboard_projects(self.hass)
            return self.async_create_entry(
                title="",
                data={"last_reset_users": cleared},
            )

        return self.async_show_form(step_id="init", data_schema=self._schema())

    @staticmethod
    def _schema() -> vol.Schema:
        return vol.Schema(
            {
                vol.Required(CONF_CONFIRM_RESET, default=False): cv.boolean,
            }
        )
